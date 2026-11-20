# AI 数字生命对话模块设计

> 更新于 2026-11-19。模型调用层已完成「方案 A」改造（手写 HTTP → Spring AI），后续优化项见第 4 节。

## 1. 主流程（当前实现）

下图只画**已经落地**的环节，与代码一一对应；暂未实现的目标流程见 1.1。

```mermaid
flowchart TB
    A["用户问题"]
    n3["请求频率校验-令牌桶"]
    n6["保存用户消息"]
    n7["RAG 检索增强（失败降级为空上下文）"]
    n11["调用模型API（Spring AI）"]
    n17["保存 AI 响应消息"]
    n18["返回 error 事件"]
    n19["流式响应前端 delta / done"]

    subgraph s1["问题内容校验"]
        n1["内容非空"]
    end

    subgraph s2["模型可用性校验"]
        n4["前端传递的模型 id 是否有效"]
    end

    subgraph s3["模型选择"]
        n8{"用户是否选择指定模型"}
        n9["使用用户指定模型"]
        n10["按 sortOrder 顺序尝试启用模型"]
    end

    subgraph s4["处理模型响应"]
        n12["接收响应块"]
        n13{"响应类型"}
        n14["文本增量-实时推送"]
        n15["异常-已出字则保留已生成部分"]
        n16["流结束-退出"]
    end

    A --> n3
    n3 --> n1
    n1 --> n4
    n4 --> n6
    n6 --> n7
    n7 --> n8
    n8 -- 是 --> n9
    n8 -- 否 --> n10
    n9 --> n11
    n10 --> n11
    n11 --> n12
    n12 --> n13
    n13 -- 文本增量 --> n14
    n13 -- 异常 --> n15
    n13 -- 结束 --> n16
    n14 --> n19
    n16 --> n17
    n17 --> n19
    n15 --> n18
    n15 -.->|未出字则尝试下一个模型| n11
```

### 1.1 后期扩展（当前未实现）

| 扩展点 | 插入位置 | 说明 |
|---|---|---|
| 内容合规性校验 | 「内容非空」之后 | 代码里是 `// todo 问题内容合规性检查`<br />1、先使用简单的代码判断，如果存在非法则跳过<br />2、第1步没有检测出来，则使用简单便宜的ai模型进行检测 |
| 用户余额充足校验 | 「模型 id 是否有效」之后 | 目前全库无余额/配额实现，扣减方案见 4.5 |
| 模型选择 agent（planB） | 「模型选择」分支 | 当前只有 planA（按 `sortOrder` 顺序尝试） |

## 2. 功能流程

### 2.1 RAG

#### 2.1.1 RAG 检索流程（读）

```mermaid
flowchart TB
 subgraph s1["向量转换"]
        C["选择 Embedding 模型"]
        n1["Embedding模型将问题转为向量表示"]
  end
 subgraph s2["检索"]
        n2["将用户向量在向量数据库检索，得到top_k条数据"]
        n3["使用 similarity 条件进行过滤"]
  end
 subgraph s3["增强生成"]
        n4["将最终的数据拼接到系统提示词"]
  end
    A(["用户问题"]) --> C
    C --> n1
    n1 --> n2
    n2 --> n3
    n3 --> n4
```



#### 2.1.2 向量写入流程（训练侧）

```mermaid
flowchart TB
    api["POST /api/admin/digital-life/training/:refType/:refId/train"] --> ctrl["DigitalLifeAdminController.trainOne"]
    ctrl --> valid{"refType 在白名单内？"}
    valid -- 否 --> err1["400 无效的数据源类型"]
    valid -- 是 --> row["findRow 按类型取源数据"]
    row --> exists{"记录存在且可训练？"}
    exists -- 否 --> err2["404 记录不存在<br>400 仅生效简历可训练"]
    exists -- 是 --> text["buildText 拼装文本<br>类型标记 + 标题 + 摘要 + 正文"]
    text --> blank{"文本为空？"}
    blank -- 是 --> err3["400 内容为空，无法训练"]
    blank -- 否 --> split["splitText 切分<br>CHUNK_SIZE=800 / CHUNK_OVERLAP=100"]
    split --> embed["resolveEmbeddingModel(embeddingModelId)<br>ModelClient.embed 整批向量化"]
    embed --> embFail{"调用成功？"}
    embFail -- 否 --> err4["400 向量化失败"]
    embFail -- 是 --> replace["VectorService.replaceChunks<br>@Transactional"]
    replace --> del["VectorMapper.deleteByRef<br>先删该 refType + refId 的旧向量"]
    del --> ins["逐块 INSERT dl_vectors<br>embedding 以 ?::vector 写入"]
    ins --> flag["updateTrainType 置 1"]
    flag --> active["指定了 embeddingModelId 时<br>setActiveEmbeddingModel（训练与检索用同一模型）"]
    active --> ok["200 返回 chunkCount"]
```

**切分规则**（`TrainingServiceImpl.splitText`）

| 项            | 值                                               | 说明                                   |
| ------------- | ------------------------------------------------ | -------------------------------------- |
| CHUNK_SIZE    | 800 字符                                         | 单个 chunk 上限                        |
| CHUNK_OVERLAP | 100 字符                                         | 相邻 chunk 的重叠尾部                  |
| 分隔符优先级  | `\n\n` → `\n` → `。` → `；` → `，` → 空格 → 硬切 | 递归降级，超长片段用下一级分隔符继续切 |
| 合并策略      | 小片段合并到 ≤ 800                               | 合并时与上一块保留 100 字符重叠        |

**写入语义**

- **覆盖式写入，不是 upsert**：同一 `refType + refId` 重新训练时先 `DELETE` 再逐块 `INSERT`，整个过程在 `replaceChunks` 的同一个事务内
- `dl_vectors` 有 `UNIQUE (ref_type, ref_id, chunk_index)` 兜底；同一记录并发重训可能撞唯一约束（目前无分布式锁/重试）
- `embedding` 以字符串字面量 `[0.1,0.2,...]` 传参 + `?::vector` 强转，避免额外 TypeHandler；维度必须是 1024（`VECTOR(1024)`）
- 检索走 `hnsw (embedding vector_cosine_ops)` 索引

**训练状态 `train_type`**

| 值   | 含义                              | 产生位置              |
| ---- | --------------------------------- | --------------------- |
| 0    | 未训练 / 训练已失效（内容被改过） | `invalidateIfTrained` |
| 1    | 已训练，向量可用                  | `trainOne`            |
| 2    | 已移除训练，不参与检索            | `removeOne`           |

#### 2.1.3 向量失效与删除

```mermaid
flowchart LR
    edit["源内容被编辑<br>Article / Blog / Resume / About*"] --> inv1["TrainingService.invalidateIfTrained"]
    inv1 --> chk{"trainType = 1？"}
    chk -- 是 --> d1["deleteByRef<br>trainType 置 0"]
    chk -- 否 --> skip["直接跳过"]

    removed["源内容被删除"] --> inv2["invalidateByRef<br>deleteByRef"]
    manual["POST .../remove"] --> rem["removeOne<br>deleteByRef + trainType 置 2"]
```

| 场景         | 入口                                       | 行为                         | 结果状态        |
| ------------ | ------------------------------------------ | ---------------------------- | --------------- |
| 内容被编辑   | 各业务 Service 调 `invalidateIfTrained`    | 仅当 `train_type=1` 时删向量 | 0（待重新训练） |
| 内容被删除   | `invalidateByRef`                          | 直接删向量                   | 记录已不存在    |
| 手动移除训练 | `POST .../training/:refType/:refId/remove` | 删向量                       | 2               |
| 重新训练     | `POST .../training/:refType/:refId/train`  | 先删后插                     | 1               |

> 注意：`dl_vectors` 只做「按 refType + refId 整体替换」，不支持单块增量更新；检索侧也不区分 embedding 模型，**换 embedding 模型后必须全量重训**，否则新旧向量不在同一语义空间。

## 3. 代码结构

| 层 | 类 | 职责 |
|---|---|---|
| 入口 | `ChatController` | `POST /api/user/digital-life/chat`，限流 + 模型预检后返回 `SseEmitter`（事件 `delta` / `done` / `error`） |
| 编排 | `ChatServiceImpl` | 用户消息入库 → RAG → 拼 messages → 多模型顺序 fallback → 回复入库 |
| 模型调用 | `ModelClient` | 唯一模型出口：`chat` / `streamChat` / `embed`，底层为 Spring AI `OpenAiChatModel` / `OpenAiEmbeddingModel` |
| 模型路由 | `ChatModelRouter` | 多模型顺序 fallback；流式已出字不切换，全部失败抛 `ModelException` |
| 上下文 | `ChatContextCache` | 会话窗口进程内缓存（Caffeine，20 条 / 30 分钟），首次访问从库回填 |
| 模型配置 | `ModelConfigServiceImpl` | `dl_models` 表驱动，AES-GCM 密文 Key，运行时增删改与连通性测试 |
| RAG | `VectorServiceImpl` + `VectorMapper` | 远程 embedding → PostgreSQL pgvector 余弦检索（`dl_vectors`），写入 / 删除的唯一入口 |
| 检索适配 | `DlVectorStore` | `VectorStore` 实现：复用上述检索，补相似度阈值与 refType 白名单过滤 |
| 持久化 | `ChatMessageMapper` | `chat_messages` 表，无独立会话表，按 `session_id` 聚合 |
| 限流 | `RateLimitServiceImpl` | Redis Lua 令牌桶，Redis 不可用时冷却期内放行 |

## 4. 已落地：模型调用层切换到 Spring AI（方案 A）

### 4.1 依赖

```xml
<dependencyManagement>
  <dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-bom</artifactId>
    <version>1.0.0</version>
    <type>pom</type>
    <scope>import</scope>
  </dependency>
</dependencyManagement>

<dependency>
  <groupId>org.springframework.ai</groupId>
  <artifactId>spring-ai-openai</artifactId> <!-- 只引客户端库，不引 starter，避免自动配置锁死单例模型 -->
</dependency>
```

### 4.2 `ModelClient` 改造要点

1. **对外签名不变**：`chat` / `streamChat(... , Consumer<String> onDelta)` / `embed` 三个方法保持原样，`ChatServiceImpl`、`VectorServiceImpl`、`TrainingServiceImpl`、`SummaryServiceImpl`、`ModelConfigServiceImpl` 零改动。
2. **模型实例按调用参数动态构建**：`OpenAiApi.builder().baseUrl(baseUrl).apiKey(key)`，因此 `dl_models` 表里增删改、切 Key、切 baseUrl 依然即时生效，不受 yml 单例限制。
3. **路径约定保留**：库里的 baseUrl 已含 `/v1`（如 `https://open.bigmodel.cn/api/paas/v4`），故显式指定 `completionsPath("/chat/completions")`、`embeddingsPath("/embeddings")`，与改造前完全一致，避免出现 `/v1/v1/...`。
4. **流式不再手写 SSE 解析**：`chatModel.stream(prompt)` 返回 `Flux<ChatResponse>`，用 `timeout(120s).toIterable()` 阻塞消费，逐块取 `getResult().getOutput().getText()` 回调，`[DONE]` 哨兵与 `data:` 前缀解析全部由 Spring AI 接管。
5. **超时**：非流式走 `SimpleClientHttpRequestFactory`（连接 15s / 读 120s）；流式走 `JdkClientHttpConnector(java.net.http.HttpClient)`，避免为了一个连接器引入 reactor-netty。
6. **异常语义保持一致**：Spring AI 的 `RestClientResponseException` / `WebClientResponseException` 统一解包（含 Reactor 的 `ReactiveException` 包装）后，复用原有 `error.message` 提取逻辑，最终仍抛 `ModelClient.ModelException`，前端看到的错误文案不变。

### 4.3 与原实现的差异

| 项 | 改造前 | 改造后 |
|---|---|---|
| HTTP | `java.net.http.HttpClient` 手拼 JSON | Spring AI `OpenAiApi`（RestClient / WebClient） |
| 流式 | 手写 `readLine` + `data:` + `[DONE]` | `Flux<ChatResponse>` |
| Embedding | 手写 `/embeddings` 解析 float 数组 | `OpenAiEmbeddingModel.embedForResponse` |
| 连接复用 | 单例 HttpClient | 每次调用新建（模型密钥不驻留内存的取舍，见 4.7） |
| 协议扩展 | 仅 OpenAI 兼容 | 后续可接 Anthropic / Ollama 原生实现（见 4.6） |

### 4.4 验证状态

- `mvn compile` 通过（JDK 21 / Boot 3.5.3 / Spring AI 1.0.0）。
- **未做真实调用验证**：本地无可用模型 Key，`chat` / `streamChat` / `embed` 的端到端行为需在配置了 `dl_models` 的环境用「模型管理 → 连通性测试」与一次真实对话确认。

## 5. 待优化项

### 5.1 会话上下文：从「每次查库」改为内存记忆（✅ 已实现，方案 B1）

**现状**：`ChatServiceImpl.run` 每轮对话都执行

```java
// 用户消息先入库 → 再从库里把最近 20 条查回来 → 跳过自己拼成 messages
for (ChatMessage history : getHistory(userId, sessionId, CONTEXT_MESSAGE_LIMIT)) {
    if (history.getId().equals(userMessage.getId())) continue;
    messages.add(Map.of("role", ..., "content", history.getContent()));
}
```

问题：

1. 每轮对话多一次 DB 往返，且刚插入的消息要「查回来再跳过」，逻辑绕。
2. 消息体是 `List<Map<String,String>>`，非强类型，无法承载多模态、tool call、usage 等信息。
3. 窗口按「条数 20」硬编码，不是按 token，长消息容易超模型上下文。

**方案 B1（推荐先做，改动最小）**：进程内会话记忆 + 冷启动回填

- `ConcurrentHashMap<String, Deque<Message>>`（或 Caffeine，`maximumSize` 上限 + `expireAfterAccess` 30 分钟），key = `userId + ":" + sessionId`。
- 首次访问（cache miss）从 `chat_messages` 回填最近 20 条，命中后只做追加，不再查库。
- 写入顺序改为：内存先追加 → 用户消息入库（保留现有「提问必落库」语义）。
- 失效策略：`done` 后写入助手消息到缓存；后台删除会话、管理员清理消息时调用 `evict(userId, sessionId)`。
- 注意：多实例部署时各节点缓存不一致，需粘性会话，或直接跳过 B1 做 B2。
- **已实现**：组件 `ChatContextCache`（`maximumSize=2000`、`expireAfterAccess=30min`、窗口 20 条）；
  `ChatServiceImpl.run` 顺序为「取窗口 → 用户消息入库 → 追加窗口 → 组装 `system + 窗口历史 + 本轮提问`」，
  取消了「查回来再跳过自己」；`/messages` 历史接口仍直查库；`evict()` 已预留（当前无删除会话入口，仅靠 TTL）。
  剩余：消息体强类型化、按 token 裁剪，随 4.2 / B2 一起做。

**方案 B2（切 ChatClient 时一起做）**：Spring AI `ChatMemory` + 自定义 `ChatMemoryRepository`

- 用 `MessageWindowChatMemory`（窗口 20）承载窗口策略，`ChatMemoryRepository` 自定义实现，内部「缓存 + `chat_messages` 回写」，业务表仍是唯一真相源。
- 关键约束：`conversationId` 必须映射为 `userId:sessionId`；`ChatMemory` 只存 content/role，`id`、`ip`、`created_at` 等业务列仍需自己写入，不能直接替换 `ChatMessage` 实体。
- 接入方式（方案 B 落地后）：

```java
ChatClient.builder(chatModel)
        .defaultAdvisors(MessageChatMemoryAdvisor.builder(chatMemory).build())
        .build();
```

**结论**：先做 B1 消除「每轮查库」，等切 `ChatClient`（4.2）时再统一为 B2，避免两次重构。

### 5.2 Prompt 组装：字符串拼接 → `PromptTemplate` / Advisor（优先级：中）

- 现状 `ChatServiceImpl.buildSystemPrompt` 用 `String.join("\n\n", sections)` 手拼人格、基本信息、RAG 片段、反编造规则。
- 建议：人格段用 `PromptTemplate` + 占位符（`{name}` / `{style}` / `{basicInfo}`），RAG 片段改用 `QuestionAnswerAdvisor`（`searchRequest` 带 `topK` 与 `similarityThreshold`），反编造规则放 `defaultSystem`。收益是可测试、可复用、可给不同人格配不同模板。
- 注意保留现有「RAG 失败静默降级为空上下文，仍可正常对话」的行为：Advisor 需显式 `.onErrorResume(e -> Flux.empty())` 或自定义 Advisor，默认行为是抛异常。

### 5.3 多模型 fallback：Service 内 for 循环 → 显式路由组件（✅ 已实现）

- 原状：`ChatServiceImpl` 与 `SummaryServiceImpl` 各自手写「按 `sortOrder` 依次尝试，已产出 token 则不再切换」的循环。
- **已实现**：新增 `ChatModelRouter`（`digitallife/client`）：

```java
// 流式：返回累积内容 + 最后一个错误，content 为空即全部失败
StreamResult stream(List<ActiveModel> candidates, List<Map<String,String>> messages, Consumer<String> onDelta)

// 非流式：返回首个通过 extractor 校验的回复，全部失败抛 ModelClient.ModelException
String chat(List<ActiveModel> candidates, List<Map<String,String>> messages, Function<String,String> extractor)
```

- 语义保持：循环内判断累积内容长度，一旦本次调用已产出内容就 `break`，保留流中断前已生成部分。
- `ChatServiceImpl` 只负责编排（判断 `result.success()`、入库、下发事件），`SummaryServiceImpl` 传 `this::normalize`
  作为 `extractor`，摘要为空时自动尝试下一个模型。
- 未实现 `RoutingChatModel implements ChatModel`：路由组件是业务层封装，不是 Spring AI 的 `ChatModel` 实现；
  消息体已完成强类型化（`List<Message>`），但 `ChatModel` 的 fallback 需要装饰器式实现，等有 Advisor 场景时再做。

### 5.4 RAG：手写 SQL → 自定义 `VectorStore` 适配（✅ 已实现）

- 保持 `dl_vectors` 表结构与 `ref_type / ref_id / chunk_index` 语义不变（后台训练、去重、覆盖逻辑都依赖它），未引入 `PgVectorStore` 默认表。
- **已实现** `DlVectorStore implements VectorStore`（`digitallife/vector`）：
  - `similaritySearch(SearchRequest)` 复用 `VectorService.search(query, topK, refTypes)`，把 `<=>` 的余弦距离转成相似度
    （`similarity = 1 - distance`），低于 `similarityThreshold` 的片段直接丢弃
  - `Document` 的 metadata 携带 `refType / refId / chunkIndex / distance`，对话侧据此渲染「来源」标签
  - `add / delete` 显式抛 `UnsupportedOperationException`：写入删除仍走 `VectorService.replaceChunks / deleteByRef`，
    避免绕过 chunk 覆盖与事务语义
- `VectorMapper.search` 增加 `refTypes` 参数（逗号串 → `ref_type = ANY(string_to_array(?::text, ','))`），
  白名单取 `RefTypes.ALL`，顺带过滤掉不在白名单里的历史脏数据。
- `ChatServiceImpl.renderChunksBlock` 改为 `vectorStore.similaritySearch(SearchRequest...)`（topK=5、threshold=0.5），
  RAG 片段仍拼进 system prompt 的「【补充规则】」，**未使用 `QuestionAnswerAdvisor`**，避免改变 prompt 结构与回答风格。
- 检索异常仍降级为空上下文（`VectorServiceImpl` 内部 catch + `ChatServiceImpl` 兜底），完整调用链与降级点见 2.1。

### 5.5 Token 统计与余额扣减（优先级：低，目标流程见 1.1）

- 「用户余额是否充足」目前**无实现**（全库无余额/配额相关代码），仅 Redis 令牌桶限流。
- 若要做：流式需开启 `OpenAiChatOptions.builder().streamUsage(true)`，从 `ChatResponse.getMetadata().getUsage()` 取 prompt/completion token；扣减应在 `done` 回调前完成，并给 `ChatService.ChatOptions` 增加 usage 回调位。

### 5.6 其他

| 项 | 现状 | 建议 |
|---|---|---|
| Anthropic | `PROVIDER_BASE_URLS` 有 `anthropic`，但走 OpenAI 协议，选中必失败 | 引入 `spring-ai-anthropic`，按 provider 分派构建对应 `ChatModel` |
| 模型参数 | `temperature=0.7` / `maxTokens=2048` / `dimensions=1024` / `topK=5` 全部硬编码 | `dl_models` 加 `temperature` / `max_tokens` 列，映射到 `OpenAiChatOptions` |
| 密钥驻留 | 每次调用解密后即用即弃 | 若后续加实例缓存（`OpenAiApi` 按 baseUrl+apiKey 缓存以复用连接池），需评估明文 Key 常驻堆内的风险 |
| SSE 契约 | `ChatController` 返回 `Object`（开流前 429/409 JSON + 开流后 SSE） | 若切 WebFlux，需保留该契约与 `retryAfterSeconds` 字段；单实例 MVC + `SseEmitter` 可继续用 |
| 上下文窗口 | 按条数 20，非 token | 结合 4.1 一并改为按 token 裁剪（可用 Spring AI `TokenCountEstimator`） |

## 6. 优先级建议

| 顺序 | 事项 | 预期收益 | 工作量 | 状态 |
|---|---|---|---|---|
| 1 | 4.1 方案 B1（内存记忆 + 冷启动回填） | 每轮少一次 DB 查询、消息体可强类型化 | 0.5~1 天 | ✅ 已完成 |
| 2 | 4.3 抽 `ChatModelRouter` | 编排层瘦身，两处循环合并 | 1 天 | ✅ 已完成 |
| 3 | 4.2 + 4.1 方案 B2（`ChatClient` + `ChatMemory` + Advisor） | 与 Spring AI 生态对齐，便于接工具调用/结构化输出 | 3~5 天 | 🟡 部分完成：消息强类型化 + ChatClient 化已做，`ChatMemory` / `PromptTemplate` / Advisor 未做 |
| 4 | 4.4 自定义 `VectorStore` + 阈值/过滤 | 检索质量可调，Advisor 可复用 | 2 天 | ✅ 已完成 |
| 5 | 4.5 token 统计 → 计费 | 支撑 1.1 的余额校验 | 2 天 | 待做 |
| 6 | 4.6 其余 | 体验/可维护性 | 按需 | 待做 |



# 附录

## RAG 详细流程

### 检索流程（读）

```mermaid
flowchart TB
    start["ChatServiceImpl.run 第 3 步"] --> render["renderChunksBlock(用户提问)"]
    render --> store["DlVectorStore.similaritySearch<br>topK=5，similarityThreshold=0.5"]

    store --> service["VectorServiceImpl.search<br>query + topK + RefTypes.ALL"]
    service --> resolve["resolveEmbeddingModel(null)"]
    resolve --> pick["按优先级选嵌入模型<br>显式指定 → 启用中 → 有 Key → 智谱兜底"]
    pick --> embed["ModelClient.embed<br>OpenAiEmbeddingModel POST /embeddings（1024 维）"]

    embed --> empty{"向量为空？"}
    empty -- 是 --> degrade["catch：log.warn + 返回空列表"]
    empty -- 否 --> sql["VectorMapper.search<br>WHERE ref_type 在白名单内<br>ORDER BY 余弦距离 LIMIT topK"]
    sql --> rows["返回 content / refType / refId / chunkIndex / distance"]
    rows --> threshold{"similarity = 1 - distance<br>是否不低于 0.5"}
    threshold -- 否 --> drop["丢弃该片段"]
    threshold -- 是 --> doc["转 Document<br>metadata 带 refType / refId / distance"]

    doc --> merge{"是否有可用片段？"}
    drop --> merge
    merge -- 否 --> none["补充规则 = 无检索到的资料片段"]
    merge -- 是 --> hit["补充规则 = 逐条渲染<br>（来源：类型标签）+ 片段正文"]

    none --> sys["拼进 system prompt 的【补充规则】"]
    hit --> sys
    sys --> nextStep["继续组装 messages → ChatModelRouter"]

    resolve -.->|取不到模型或 Key| degrade
    embed -.->|HTTP 失败| degrade
    sql -.->|SQL 异常| degrade
    degrade --> none
```

**降级点（任一失败都不阻断对话）**

| 失败位置                           | 行为                                 | 最终表现                         |
| ---------------------------------- | ------------------------------------ | -------------------------------- |
| 选不到嵌入模型 / 未配置 Key        | `VectorServiceImpl` 捕获后返回空列表 | 按「无检索到的资料片段」作答     |
| `/embeddings` 调用失败或返回空向量 | 同上                                 | 同上                             |
| pgvector 查询异常                  | 同上                                 | 同上                             |
| 所有片段相似度低于 0.5             | `DlVectorStore` 全部丢弃             | 同上                             |
| `similaritySearch` 自身抛异常      | `renderChunksBlock` 兜底             | 「资料检索暂不可用」，仍正常回答 |

**关键参数**

| 参数                | 值             | 位置                                       |
| ------------------- | -------------- | ------------------------------------------ |
| topK                | 5              | `ChatServiceImpl.RAG_TOP_K`                |
| similarityThreshold | 0.5            | `ChatServiceImpl.RAG_SIMILARITY_THRESHOLD` |
| 向量维度            | 1024           | `ModelClient.EMBEDDING_DIMENSIONS`         |
| refType 白名单      | `RefTypes.ALL` | `DlVectorStore.similaritySearch`           |
