import{_ as J,g as X,C as j,h as Y,c as s,a as r,p as ee,j as k,z as D,F as T,t as m,b as _,e as v,q as y,r as te,x as P,s as re,D as se,o,A as $,w as S,n as R}from"./index-DFVaoTh1.js";import{A as oe}from"./AppHeader-DRJ2tZSa.js";import{A as ae}from"./AppFooter-C8yeRc7l.js";import{A as ne}from"./ArticleCover-UuC07lIw.js";import{r as ie}from"./markdown-DbTdvv2o.js";const ce=`# 1 ETH和BTC区别

:::success
在区分ETH和BTC时，可以着重理解ETH的设计目的——ETH的设计目的很大程度上是为了保障ETH的出块速度以及支持执行智能合约
:::

## 1.1 挖矿方面(Mining)

+ ETH：使用基于高内存(memory hard)的挖矿问题(mining puzzle)，通过设计来抵制ASIC芯片（ASIC resistant） 
+ BTC：关注于挖矿问题(mining puzzle)本身，注重计算和算力本身，内存占用不高，因此出现大量ASIC芯片（高算例，低内存）来作为矿机进行挖矿

## 1.2 智能合约(smart contract)

智能合约是一种去中心化的合同。合同是一种通过司法手段来保证合同内容规则被执行的约定。而智能合约使用代码手段来实现合同内容，使得合同具有强执行力，确保合同不会发生违约。ETH中使用技术手段代替司法公信力来生存智能合约，确保合约方按照合约规则进行，通过技术手段防止合约双方出现违约问题。

+ 去中心化合同有什么优势？

代码一旦发布到区块链，任何人都无法修改，所有参与者必须按照合约内容执行

## 1.3 证明方式(Proof)

+ BTC使用工作量证明的方式来记录区块
+ ETH使用权益证明（Proof of stake）的方式来记录区块

## 1.4 交易方式

+ BTC使用基于账本的方式来记录交易方式
+ ETH使用基于账户的方式来记录交易方式

### 1.5 稀缺性

+ ETH不具备稀缺性，出块数量是为了调节ETH交易打包速度
+ BTC具备稀缺性，每21万个区块后出块数量会减半；

# 2 账户模式

以太坊采用的是基于**账户**的模型，类似现实中的银行账户，任何转账交易无需说明币的来源，这样做可以避免产生双花问题（Double Spending Attack），但是需要防范重放攻击（Replay Attack），当A转给B一共10个ETH，且该交易被发布到区块链上，但是B将该交易重新在网络上广播一遍，则A被扣除了两遍ETH。

以太坊通过nonce（计数器）来防止重放攻击，A在转账时候，将交易次数nonce作为交易的一部分发布，并将整个交易进行签名，然后发布到以太网络，其他节点拿到交易后进行检查（其他全节点会维护每个账户的nonce），可以通过A的公钥来检查该交易是否被篡改，其他节点无法修改nonce的值，并且当其他恶意节点进行重放攻击时，nonce值已经存在过了，则这次重放的交易不会被认可。

:::success
double spending 和 replay spending可以看做一个对称的攻击方式：

+ 双花：花钱方不诚实，花了两次
+ 重放：收钱方不诚实，收了两次

BTC为什么不可能出现重放攻击？

是因为每次UTXO中花费某个BTC后，实际上是将某个账户的BTC全部花了出去，旧的UTXO中不再保存原有的，而是摧毁原有的交易并且新建新的交易吗？例如：UTXO中存了A->B(10BTC)，现在B要转给C5个BTC，则UTXO中摧毁A->B(10BTC)而是生产，B->C(5BTC)和B->B'(5BTC)  
:::

为什么采用账户模式？

为了满足实现defi（去中心化金融）的目的，以太坊采用账户模式（account-based）来支持defi，如果不采用账户模式，比特币中"角色"是多变的，每一笔交易都可以被认为是由全新的角色发起并执行的，defi的智能合约在执行后，很难找到当初调用智能合约的"角色"，因此采用账户模型，可以在合约执行完成后，将合约执行结果返回给对应账户上，避免出现找不到账户或账户被冒充的情况。

## 2.1 账户类型

以太坊中有两类账户，第一种是**外部账户**，既用来记账和交易的账户，通过公私钥对来控制，具有nonce，用来防止重放攻击，具有balance用来记录余额。而另一种账户是**合约账户**，合约账户无法主动发起交易，合约账户中定义一段代码（code），相关的状态（storage），但是合约账户无法主动发起交易，仅能被外部账户调用或调用其他合约账户。

1. 外部账户：
+ 属性：
    - balance：账户余额，记录当前账户剩余的ETH，最小单位是wei；
    - nonce：当前账户交易次数，用来防止重放攻击；
+ 性质：可以主动发起交易，并且调用合约账户
2. 合约账户：
+ 属性：
    - code：合约代码，每次被调用时候会执行合约中的代码；
    - storage：合约账户存储空间，可以将变量存储到该空间中，所有调用均可能对该变量进行更改；
+ 性质：无法主动发起转账；

:::success
ETH使用账户模型是为智能合约服务。如果像BTC系统一样匿名，则用户的合约执行结果无法很好反馈到对应外部账户，如果一个账户调用了合约，执行完成后该用户的地址发生变化，那么这个合约执行结果无法同步给原来的账户，合约会失去对应的意义。
:::

# 3 状态树

:::success
1. 为什么ETH不能使用默克尔树的结构？

因为BTC是不可更改的，每一笔交易只会新增，不会存在修改前某几笔交易的需要，而ETH系统维护的是各个地址的状态（address -> state），因此记录在区块上的账户状态会发生变化，因此不能使用默克尔树结构
:::

如何通过账户地址（addr）找到对应的账户状态（state包含账户的余额）？

+ 账户地址：160bits（20字节），一般用40个16进制数（0~f）来表示；一般是通过公钥取哈希然后截取一定范围获取而来；
+ 账户结构1：**trie树（前缀树）**，简化账户地址，假如：一个地址只有3位，且每一位都在[a，b，c]中，则一共可以存3 * 3 * 3个地址。
    - 性质：
        * 数量取决于key节点的枚举数量，在ETH中，地址是40个16进制数，所以分叉有17个（0~f）；
        * 查找效率取值与key的长度，长度均为40；
        * trie树不会出现碰撞，不同的key一定不会匹配到相同地址的value；
        * 无论插入顺序是什么样，trie树的顺序不会被打乱；
        * trie树更新是局部性的，无需改变整棵树的顺序；
    - 缺点：空间占用大，深度长
    - 查找：当需要添加一个a-a-b账户时候，就只需要沿着root找到第一层的a，找到第二层的a，找到第三层的b即可找到对应账户；
    - 添加：新增一个账户不会改变当前结构，比如想要新增一个a-b-c，则只需要找到a，然后在a下面找到b，再在b下面创建一个c节点即可，无需对整个结构进行调整；
    - 删除：区块链的不可篡改性一般不支持删除；
    - 修改：根据地址查找到对应账户以后，可以直接对该地址下的账户内容进行修改；

![画板](https://cdn.nlark.com/yuque/0/2025/jpeg/23025892/1766578419859-7d100d66-f313-4e10-bb9a-965a1c253ebd.jpeg)

+ 账户结构2：由于trie的缺点—— 空间占用大，**Patricia tree（ 压缩前缀树 ）**这种结构应运而生，近一步对账户相同的前缀进行压缩。当前缀未被扩展时候，保持前缀压缩状态，当新增账户后，将压缩的前缀进行舒展。

:::success
ETH的地址是160位，可以产生共计2<sup>160</sup>个账户，因此ETH的地址实际上是很稀疏的，稀疏的key适合使用压缩前缀树。

ETH的地址为什么这么稀疏？

因为哈希算法是可能存在碰撞的，不同公钥取哈希映射出对应的地址，根据哈希算法的碰撞性，可能出现不同公钥映射出相同地址的情况，为了尽可能避免这种情况的发生，ETH使用160位的地址来降低碰撞的发生，**实际概率是无限趋近于零的。**
:::

    - 压缩状态：当只有一个abc账户时候，无需展开，采用压缩状态来节省空间、提高查找效率；

![画板](https://cdn.nlark.com/yuque/0/2025/jpeg/23025892/1766580060657-85a7093d-fb8e-48a9-967e-1bf667a7fce8.jpeg)

    - 舒展状态：当系统中已经存在了abc时候，此时需要新增一个acb，则会将abc进行舒展，舒展称为a-c-b；

![画板](https://cdn.nlark.com/yuque/0/2024/jpeg/23025892/1732019891854-e6e845fe-9cf7-4b85-8485-edfd56f2f491.jpeg)

+ 账户结构3：**Merkle Patricia Tree**，以太坊实际的数据结构，在Patricia Tree的基础上近一步将指针转换为哈希指针，以便进行Merkle Proof，而以太坊实际上使用的是**Modified Merkle Paticia Tree**。区别在于，ETH的**Modified Merkle Paticia Tree**中每次写入区块链时候，会新建一个MMPT，这个MMPT与之前区块上的MMPT相比，仅有部分节点状态发生改变。此时未发生改变的节点地址仍然指向上一个区块的地址，仅需要对发生改变的节点创建新的节点并记录变化后的状态，然后将地址映射到新地址上，以此来优化操作和减少占用空间。这种MMPT的设计是为了——**回滚**，当区块出现分叉，某一条分叉被确定不是最长链以后，需要对该区块做出的操作进行回滚操作；

:::success
总结：

1. ETH的MPT采用**增量更新**——仅修改状态变化的路径节点，其余节点复用，大幅降低存储开销。
2. ETH中存在智能合约，如果要支持回滚，必须保存历史状态，以便在执行出错、gas耗尽、消除分叉的时候能快速回滚到之前的状态；
3. 这里说的**增量更新**不是对已经记录在区块链上的状态树进行更新，而是对根据交易和合约执行情况，对即将打包上链的区块进行更新（该区块的状态树预期只有部分发生改变，因此这个数据结构可以快速达到更新构造新状态树的目的）  
:::

## 3.1 块头结构(Block Header)

\`\`\`
type Header struct {
    // 上一个区块块头的哈希值
    ParentHash   common.Hash   \`json:"parentHash"       gencodec:"required"\`
    // 叔叔区块的哈希值
    UncleHash    common.Hash   \`json:"sha3Uncles"       gencodec:"required"\`
    // 出块矿工地址
    Coinbase     common.Address \`json:"miner"            gencodec:"required"\`
    // 状态树根哈希值  
    Root         common.Hash   \`json:"stateRoot"        gencodec:"required"\`
    // 交易树根哈希值
    TxHash       common.Hash   \`json:"transactionsRoot" gencodec:"required"\`
    // 收据树
    ReceiptHash  common.Hash   \`json:"receiptsRoot"     gencodec:"required"\`
    // 收据树布隆过滤器
    Bloom        Bloom         \`json:"logsBloom"        gencodec:"required"\`
    Difficulty   *big.Int      \`json:"difficulty"       gencodec:"required"\`
    Number       *big.Int      \`json:"number"           gencodec:"required"\`
    GasLimit     uint64        \`json:"gasLimit"         gencodec:"required"\`
    GasUsed      uint64        \`json:"gasUsed"          gencodec:"required"\`
    Time         *big.Int      \`json:"timestamp"        gencodec:"required"\`
    Extra        []byte        \`json:"extraData"        gencodec:"required"\`
    MixDigest    common.Hash   \`json:"mixHash"          gencodec:"required"\`
    Nonce        BlockNonce    \`json:"nonce"            gencodec:"required"\`
}
\`\`\`

## 3.2 区块结构(Block)

\`\`\`
type Block struct {
    header    *Header
    uncles    []*Header
    transactions Transactions

    // caches
    hash atomic.Value
    size atomic.Value

    // Td is used by package core to store the total difficulty
    // of the chain up to and including the block.
    td *big.Int

    // These fields are used by package eth to track
    // inter-peer block relay.
    ReceivedAt time.Time
    ReceivedFrom interface{}
}
\`\`\`

:::success
1. 状态树实际上存储的是(key,value)，value是如何存储在状态树中的？

实际上value是经过一个RLP（Recursive Length Profix）序列化后的一个value值，该序列化方案是一种极简的序列化方式——只支持字节数组（可嵌套）的序列化方式
:::

# 4 交易树和收据树

当以太坊发布区块时候，会将交易发布到交易树上，交易树和收据树也使用Merkle Patricia Tree结构，支持查找操作，交易树和收据树只把当前区块的交易组装成交易树，而状态树是把所有账户组装成一个状态树。

:::success
虽然状态树、收据树、交易树都使用MPT作为存储结构，但是三者存在不同：

1. 状态树的key是ETH账户的地址，而交易树和收据树key是交易在发布区块的序号
2. 状态树包含整个链上所有区块的账户状态，而交易树和收据树只记录当前区块的交易信息；
:::

**交易树和收据树的用途**

1. 进行简单Merkle Proof；
2. 复杂操作，例如：十天内与某个地址进行过智能合约计算的账户；

**Bloom filter（布隆过滤器）**

为了解决上述ETH的复杂操作，ETH引入了布隆过滤器数据结构。可以快速查找某个元素是否在一个集合中，维护一个向量表，该表每个位置仅仅记录0和1，使用哈希算法将集合中每个元素进行求哈希操作，根据哈希找到对应向量表的位置，并将其位置修改为1，处理完集合中每一个元素后，该向量就是集合的一个摘要。当有一个元素a，想要判断其是否在集合中，则对a取哈希，得到的地址判断其位置是1还是0，如果是1则说明在该集合中。（假设哈希函数离散程度够高，不会出现哈希碰撞）

:::success
如果一个值在布隆集合里面，则这个值可能在，如果一个值不在布隆集合里面，则转给值一定不在——宁可错杀也不放过

+ 缺点：不支持删除操作，只能假如到布隆集合中，不能从集合中删除；
:::

**如何找到一个交易？**

1. 每个区块的块头都会维护一个收据树的Bloom filter，首先在各个块头的Bloom filter中查找某笔交易是否记录在该区块中；
2. 如果块头中Bloom filter中存在当前交易，则在区块的收据树的每笔交易组织起来的Bloom filter中寻找是否存在这笔交易；

**交易驱动的状态机**

以太坊交易的过程可以被看作是一台交易驱动的状态机，状态是所有账户的状态集合，交易是每次发布区块中包含的交易，通过执行区块中包含的交易，会驱动系统从当前状态转换为下一个状态

:::success
转账钱是否需要强制把某个账户注册在ETH区块链上？

ETH在发生第一次交易之前，生产的账户不会被记录在ETH区块链中，仅当账户第一次出现转账时，该账户才会被记录到区块链上

状态树是否能只记录当前区块发生变动账户的状态？

不可以，因为智能合约的回滚会用到某个账户的前一个状态，如果只记录当前账户的状态，查找账户前一个状态的操作会变得非常低效。除此之外，当旧账户向新账户转账时候，区块链无法感知这个新账户是否存在，除非遍历整个链到创世纪块的交易树，才能确定某个账户的存在性
:::

**交易树和收据树的创建流程**

\`\`\`
用户提交交易 → 交易进入内存池 → 矿工打包
    ↓
交易被放入区块 → 形成交易树（交易哈希作为键）
    ↓
EVM按顺序执行交易 → 生成收据 → 形成收据树
    ↓
收据树根哈希写入区块头 → 状态树更新
\`\`\`

:::success
总结：交易树是EVM执行交易中智能合约、转账操作之前的状态（**交易树记录的是"执行前"的指令**），在EVM执行完区块中智能合约和转账操作之后，交易中的各个交易中合约和转账被执行后，会改变状态树的状态（**EVM执行后会改变状态树**），然后在收据树记录EVM执行的结果（**收据树记录执行结果**）
:::

# 5 Ghost协议（当前ETH已废弃）

以太坊的出块时间较快，可能会出现同一时间两个矿工同时出块的情况，BTC对这种情况采取**最长合法链**，只有提交到区块后，并且成为最长链的区块链才会被接受，其他的较短链上的区块会成为**孤儿区块**（orphan），这些区块的出块奖励会被丢弃。如果最长链上的矿工才能获得奖励，这样做会有一个问题——**大矿主垄断问题**，矿池越大，则其算出结果的可能性越大，该矿池只会把自己的块链接到上一个自己挖出的块中，依次类推，该矿池会成为整个链的实际控制者。如下图所示，A链成为了orphan，后续矿工会继续沿着B链进行挖掘。（为了解决临时分叉的问题）

:::success
总结：如果ETH继续沿用BTC的最长合法链机制，会导致大矿池出现垄断（centraliazation bias），GHOST让**同一游戏的竞争更公平**
:::

![画板](https://cdn.nlark.com/yuque/0/2025/jpeg/23025892/1766813980564-654ae2e5-2a21-412f-a00c-c7529053dde8.jpeg)

## 5.1 Ghost协议

为了解决ETH高速带来的问题，ETH通过Ghost协议来解决共识问题。

**初版Ghost协议内容**

ETH使用**叔叔区块**（**uncle block**）来解决这个问题，当A、B、C同时出块时候，新的块选择链接到B后面，则A和C成为了uncle block（叔叔区块），叔叔区块的矿工会获得cur * (7/8)个ETH的奖励（cur表示当前ETH的出块奖励数量），而B成为区块主链后会获得cur个ETH奖励。每一个区块可以包含2个叔叔区块，如果B愿意**接受**叔叔区块，则会额外获得 2 * (1/32) * cur个ETH的奖励，这样设计可以鼓励分叉的合并。

:::success
接受叔叔区块：通过在区块头中维护2个（ETH设定最多2个）叔叔区块的块头哈希来表示当前最新挖出的区块要接受哪2个叔叔区块。当叔叔区块被孤立时候，块中记录的交易会立即回到内存交易池中，重新等待被打包，状态上，这些交易就像从未被打包过一样。虽然这些交易未被打包，但是叔叔区块也能获得(7/8) * cur个区块的奖励，这一机制旨在保障挖错链矿工的收益
:::

![画板](https://cdn.nlark.com/yuque/0/2024/jpeg/23025892/1732104696246-f370e912-f4f4-4e10-9d54-7f91513c1410.jpeg)

**初版Ghost协议的问题**

1. 当同时出现三个叔叔区块时候，有一个叔叔区块会被抛弃，该区块会被遗弃，成为orphan；
2. 如果新区块在发布时候，还未从网络上受到叔叔区块出块的消息，那么这个叔叔区块是无法获得收益的；
3. 可能某个矿池出于竞争原因，恶意不包含他人的叔叔区块，以损失自己小利益换取对手更大利益损失；

为了解决上述问题，Ghost协议近一步改进：

1. 每个叔叔区块可以隔代认证，子代不认可区块时候，该区块后一个区块仍然可以包含叔叔区块。（叔叔可以隔代）
2. 叔叔区块可以隔代，但是为了防止隔代过长，ETH规定每隔一代，出块奖励减少1/8，直到减少到2/8个ETH奖励（7代以内）（无论哪一代的叔叔区块被写入到当前区块的块头，都是会获得1/32 * cur个ETH的奖励，该奖励不会递减，防止当前区块不包含早起的叔叔区块）

:::success
1. 为什么限制叔叔区块的最大代数？

限制7代以内是为了鼓励区块出现分叉以后及时合并，找到激励分叉矿工和鼓励合并之间的平衡。

2. ghost协议是否能协议造成的分叉？

ghost协议是为了解决临时链的分叉选择问题，无法解决硬分叉（state fork）问题
:::

![](https://cdn.nlark.com/yuque/0/2024/png/23025892/1732105611429-65d00582-aa64-4e86-a511-7c3402df7218.png)

## 5.2 叔叔区块性质

1. 叔叔区块上的交易不会被执行，且叔叔区块交易的合法性也不会被校验，只有主链上的交易会被执行；
2. 叔叔区块会被检查是否符合挖矿要求，确保这个区块是"真的叔叔"；
3. 只有分叉后的第一个叔叔区块能获得奖励，沿着叔叔区块挖掘的区块无法获得奖励，为了避免分叉攻击，防止恶意矿工沿着叔叔区块挖掘来制造分叉（让试图分叉攻击的攻击者造成巨大损失）；
4. 叔叔区块包含的交易虽然不校验也不执行，但是这些区块也必须被包含进叔叔区块的区块体中，因为如果不这样做，无法进行挖矿算法计算，叔叔区块不包含这些交易无法成为一个可以合法的"叔叔区块"

# 6 **挖矿机制**

## 6.1 POW（当前ETH已废弃）

BTC的算法是一个天然的bug bounty，如果有人能够找到挖矿的捷径，就能获取巨大的利益，至今BTC的挖矿算法仍能平稳的运行，因此BTC的挖矿算法无疑是成功的。但是BTC的挖矿算法也存在一定的局限性——BTC的挖矿算法是内存无关的，导致厂商开发出越来越多的ASIC矿机，专用于BTC的挖矿计算，这与去中心化的理念背道而驰。为了解决矿机专业化的问题，ETH设计出一个Memory Hard的挖矿算法，以遏制矿机的专门化。

:::success
1. 为什么希望Memory Hard？

区块链的设计初衷是去中心化，只有参与者越多，挖矿才会越民主，整条区块链才更加安全。

2. 为什么不希望Memory Hard？

另外一种声音——ASIC芯片挖矿更加安全，原因是矿机除了挖矿意外无其他作用，发动分叉攻击的成本很高，攻击成功后会导致BTC价格下降，矿机成本无法回收，而通用计算设备攻击后扔可以被用作其他用途，因此攻击成功后的损失大大减少
:::

**早期Memory Hard的挖矿算法**

最早的LTC设计了一种基于Scrypt算法的挖矿算法，需要用户开设一个很大的哈希数组，按照顺序填充一定的伪随机数，后面每个位置都需要依赖前一个位置的值取hash，解决puzzle时候需要读取数组中的随机位置的一个数，根据当前位置数运算计算出下一个需要读取的位置，依次进行。通过这种方式强制让矿工保存大容量数组，避免设备asic芯片化。

上述算法可以避免设备asic芯片化，但是会导致计算者和验证者都需要维护相同的内存，对情节点验证非常不优化，**大部分轻节点是不愿意接受这种内存消耗**。因此LTC在实际应用中，只占用了128KB的内存，随着设备逐渐专业化，128KB的限制无法避免设备asic芯片化。

**ethash算法**

ETH算法近一步优化，采用大小数据集方式——大数据集进行挖矿，小数据集进行验证来解决上述问题：

1. 准备两个数组，16MB和1GB，大数组称为dataset，小数组称为cache；
2. 小数组先从种子节点进行运算得到数组第0个位置的值，然后后续的值根据前一个数组的值取哈希得到并填充；
3. 大数组会随机读取小数据集中某个位置的数（按照为随机的顺序），然后根据该数进行哈希计算得到第二个位置，依次类推，读取256次，得到一个哈希值，将该值放入到大数据集的第0个位置；
4. 依次重复3中过程，直到装满大数据值；
5. 根据区块的块头和nonce值算出初始哈希，哈希进行映射，得到映射在大数据集中的一个位置，然后读取该位置及相邻元素；
6. 然后重复5的过程，算出的target是否符合目标阈值的要求，如果不符合，则更新种子值，重新计算；

:::success
1. 大数组和小数组不是恒定不变的，根据摩尔定律周期进行动态扩大；
2. 这实际上描述的是Ethash算法的1.0版本，Ethash是一种POW的算法，以太坊已经在2022年9月通过"合并"（The Merge）从**Ethash（POW）** 完全转向了**POS（权益证明）**，结束了Ethash作为主网共识算法的历史。
3. 以太坊采用的是pre-mining模式预留部分ETH给初创者，BTC则未采用该模式，所有BTC都需要通过POW来获取；
:::

### 6.1.1 难度炸弹（当前ETH已废弃）

ETH在上线之处，就希望逐步从POW转变到POS算法，预留了难度炸弹机制，该炸弹随着区块的块号递增而增加挖矿算法的难度，随着难度炸弹的调整，基于POW的矿工将不会再能够挖出区块。但是在ETH的POW向POS转换的过程中并不顺利，出现了一个时期POW难度指数级上升，导致出块速度大大下降，这个时期通过在EIP中减少300万个区块号计算难度炸弹的方式来避免出块缓慢问题。

:::success
ETH的最长合法链实际上是最难合法链，通过计算分叉链和主链的各个区块出块总难度之和来决定谁是主链
:::

## 6.2 POS

基于POW的共识机制虽然被时间证明是安全的，但是这种方式存在巨大的现实问题——能耗过大，并且这种能耗是一种毫无意义的资源浪费，因此为了减少这种无意义的资源消耗。POW共识本质上是算力竞争，实际上算力是通过资本购买矿机转换成算力，本质上也是一种资本的竞争，因此，ETH看到了问题的本质，改进称为了一种基于权益的共识机制（Proof of stake）。

:::success
以太坊已经在2022年9月通过"合并"（The Merge）从**Ethash（POW）** 完全转向了**POS（权益证明）**，结束了Ethash作为主网共识算法的历史。
:::

BTC的POW机制虽然安全，但是对于一个小币种的POW，在他诞生之初，发起51%攻击的成本非常低，这个小币种会被扼杀在摇篮里（Infanticide），后来者无法生产。如果这个小币种采用的是权益证明，则可以实现一种闭环：

1. 如果某个人想发动攻击，需要先去得这个货币发行量一半以上的份额；
2. 而攻击的资源来自加密货币内部，外部的经济、资源无法直接影响加密货币，需要进一步进行转换；
3. 当加密货币被大量买入时候，价值会被带动起来，攻击需要的经济成本将会上升；
4. 攻击者就需要考虑自己攻击的收益是否符合预期；

这种设计方式虽然可以预防攻击，但是仍然存在一个问题——富者越富。早起能获得大量份额的参与者在后续的POS中也能获取更高的收益，依此循环，最终可能控制整条区块链。因此ETH采用一种质押（Proof of Deposit）的方式来防止这种问题——每次质押后一段时间内无法参与到权益证明的工作中

### 6.2.1 Gasper协议（当前ETH已废弃）

**Gasper协议（Gasper FFG）**

ETH早期希望使用的权益证明协议是Gasper FFG，它引入一个新的概念——验证者（Validator）来推动系统达成共识，避免出现区块分叉。这种协议结合POW和POS进行，具体实现类似数据库系统的两阶段提交（two-phase commit）方式。这种协议实际上只在ETH的测试链上运行，并未在主链上运行。

**Gasper协议**

当前ETH使用的是不依赖POW的Gasper协议。

:::success
另一种声音提出，POW可以和电力资源进行转换，通过将电能资源转换成BTC资源的方式，减少电力资源传输造成的损耗，转换过效电力产能，带动经济发展
:::

# 7 DAO

去中心化自治组织（Decentralized Autonomous Organization）是一种基于区块链技术的组织形式，旨在通过智能合约实现自主运行。

## 7.1 The DAO 事件

1. **核心理念：**  
The DAO（去中心化自治组织）是一个建立在以太坊上的、雄心勃勃的风险投资基金。它的目标是完全**去中心化**——没有管理层，投资决策由代币持有人通过智能合约投票决定。它被视为区块链"代码即法律"和去中心化治理的终极实验。
2. **技术基础：**
+ **智能合约**：The DAO 的规则全部由一个复杂的智能合约编码实现。
+ **众筹**：在2016年4月至5月期间，它进行了当时史上最大的众筹，筹集了超过**1270万枚以太币**，按当时价格价值约1.5亿美元，占当时流通ETH总量的约14%。
+ **参与方式**：用户用ETH兑换DAO代币，获得投票权和收益份额。
3. **根本性漏洞：**  
智能合约中存在一个关键的**递归调用漏洞**。简单来说，在投资者提取资金的函数中，攻击者可以设计一个恶意合约，在合约尚未更新其内部余额之前，**反复递归调用**该提款函数，从而像"无限印钞"一样，多次提取同一笔存款。

**漏洞类比**：就像银行柜台规定"先给现金，再更新账本"。攻击者利用这个时间差，在账本更新前，反复向柜员要钱，而柜员每次都照办。

4. **攻击发生（2016年6月17日）**
+ 一个未知攻击者（或组织）开始利用上述递归调用漏洞，持续从The DAO的智能合约中抽走资金。
+ 攻击持续数小时，最终转移了**360万枚ETH**（当时价值约5000万美元）到一个独立的"子DAO"中。
+ 根据The DAO的规则，这些资金有**28天的锁定期**，攻击者在此期间无法真正移走它们。这为社区反应留出了时间。
5. **社区震惊与应对**
+ 以太坊社区陷入巨大危机。这不仅关乎巨额资金损失，更动摇了人们对智能合约和以太坊本身的信任。
+ 核心开发者、Vitalik Buterin 与社区紧急讨论解决方案。当时形成了两大阵营：
    - **分叉派**：主张通过硬分叉，**回滚交易**，将被盗资金追回并返还给投资者。这实质上是进行人为干预。
    - **反分叉派**：主张"**代码即法律**"，区块链不可篡改是其核心原则。即使代码有bug，后果也应由参与者自行承担，链本身不应被改变。
6. **激烈的辩论与投票**
+ 社区进行了激烈的哲学和技术辩论。这不仅是关于一次攻击，更是关于区块链本质的意识形态之争。
+ 最终，以太坊基金会提出了一个硬分叉方案（在特定区块高度引入代码，将被盗资金转移到一个安全的退款合约）。
+ 通过社区投票（主要是ETH持有者进行链上投票），**大部分参与者支持硬分叉**。
7. **以太坊硬分叉（2016年7月20日）**
+ 在区块高度 **1,920,000**，以太坊执行了硬分叉，实施了回滚方案，将被盗的ETH返还给原投资者。
+ 这条**回滚后的新链**，继承了"以太坊"的名号，即我们现在所知的 **ETH**。
8. **以太坊经典的诞生**
+ 一部分坚持"区块链不可篡改"原则的矿工、开发者和用户**拒绝升级客户端**，继续维护原来的那条链。
+ 这条**未回滚、保留了攻击交易的原始链**，被称为 **以太坊经典**。
+ ETC 保留了原链的历史和交易记录，包括The DAO攻击交易。它的存在本身，就是"代码即法律"哲学的纪念碑。
9. **直接后果**
+ **资金返还**：ETH上的投资者收回了资金。
+ **链分裂**：加密货币史上第一次因理念不同而导致的重大链分裂，产生了两个竞争性网络：ETH 和 ETC。
+ **法律与监管关注**：美国SEC随后介入，并以此事件为例，认定The DAO的代币属于未注册的证券，加强了对ICO的监管审视。
+ **信任危机**：短期内严重打击了人们对智能合约安全性的信心。
10. **技术原因：智能合约的不成熟**
+ 当时的智能合约开发工具、审计实践和安全范式都处于**极其早期和幼稚的阶段**。The DAO的代码尽管经过审计，但仍存在致命漏洞。
+ 这暴露了"代码即法律"的残酷性：代码中的漏洞就是法律中的漏洞，且无法事后补救。
11. **治理原因：中心化与去中心化的矛盾**
+ 事件处理过程揭示了以太坊早期治理的**隐蔽中心化**。虽然决策有投票，但以太坊基金会和核心开发者在推动分叉中发挥了巨大影响力。
+ 这引发了一个根本性问题：当系统出现重大危机时，**谁有权决定改变协议？** 是开发者、矿工、持币大户，还是所有人？
12. **哲学/意识形态原因：区块链的本质之争**
+ **ETH阵营**的观点：区块链是为了服务人类，当出现明显的错误和不公时，社区有权也有责任进行干预，以维护系统的**正义和长期生存**。实用性高于绝对主义。
+ **ETC阵营**的观点：区块链的**不可篡改性和抗审查性**是其至高无上的价值。一旦为了便利而打破原则，就开了一个危险的先例，链的"中性"和"可信性"将不复存在。原则高于结果。
13. **经济与政治原因：**
+ 被盗资金规模过于巨大，涉及众多早期支持者和投资者。如果不干预，可能直接导致以太坊生态的经济崩溃和信誉破产。
+ 分叉也是一种**政治和经济上的自救行为**，以保护大多数人的资产和生态的未来。
14. **总结**

**The DAO事件**远不止一次简单的黑客攻击。它是一个**分水岭时刻**：

+ **技术上**，它催生了更严谨的智能合约审计、形式化验证以及像"重入锁"这样的标准安全模式。
+ **治理上**，它迫使区块链社区深入思考去中心化治理的极限和决策机制。
+ **哲学上**，它永久性地在加密货币世界刻下了"**可干预的实用性**"与"**不可篡改的纯粹性**"之间的裂痕，这条裂痕 embodied（具象化）为 ETH 和 ETC 两条并存的区块链。

其遗产至今仍在影响着每一个新区块链项目的设计、开发和治理哲学。

## 7.2 The DAO 事件反思

1. 不可篡改性是一把双刃剑
2. 不要迷信区块链的不可篡改性
3. solidity语言有很大提升空间，但是使用函数式的语言替换是需要商榷的
4. 开源是否真的安全？开源——更多人来审核代码增大公信力，但是也会有更大概率发现bug
5. 分叉才是真正去中心化的体现，中心化的组织是没办法分散意见的，永远会堵住最小化的声音
6. 去中心化 不是 分布式系统，去中心化系统不然是分布式系统，分布式系统不一定是去中心化的
7. 区块链本身是不篡改的，但是不能保障发布到区块上的东西非虚假
8. 中心化和非中心化并非黑白分明，两者的融合才是最合适的
`,le={"mysql-connection-pool-tuning":"MySQL 连接池调优：从 200ms 到 8ms 的实战","mongodb-aggregation-performance":"MongoDB 聚合管道性能分析与索引优化","express-middleware-order":"Express 中间件执行顺序的那些坑","openspec-getting-started":"openSpec 入门：用规格文件驱动 AI 编码","llm-inference-kv-cache":"大模型推理优化实战：KV Cache 与批处理","react-class-to-hooks":"从 Class 到 Hooks：一次 React 状态管理的迁移复盘","go-generics-config-parser":"用 Go 泛型重写我们的配置解析库","postgresql-partitioned-orders":"PostgreSQL 分区表在我们的订单系统上的落地","rust-hot-path-rewrite":"用 Rust 重写热点路径：一次值得的 30 倍提速","strategy-pattern-billing":"策略模式在计费规则引擎中的实战应用","rest-to-grpc":"从 REST 到 gRPC：内部服务通信的协议演进","k8s-hpa-cost-cut":"我们如何用 K8s HPA 把成本砍掉 40%","prometheus-alert-fatigue":"Prometheus 告警疲劳治理：从 200 条到 12 条","testing-pyramid-revisited":"让单测真正有用：我们团队的测试金字塔回归","distributed-training-scaling":"从单机到 8 卡：一次大模型训练的效率爬坡","negative-space-aesthetics":"留白不是空白：东方美学中的负空间","user-feedback-to-decision":"从用户反馈到产品决策的距离","designer-morning-ritual":"一个设计师的晨间仪式","eth-btc-differences":"1 ETH和BTC区别"},ue={"mysql-connection-pool-tuning":`# MySQL 连接池调优：从 200ms 到 8ms 的实战

> 在高并发场景下，连接池配置直接决定接口延迟。本文记录我们在 NodeJS 服务中对 MySQL 连接池的调优过程，包括最大连接数、空闲回收与超时策略。

去年我们一个订单查询接口的 P99 延迟稳定在 200ms 以上，而实际 SQL 执行只要 3-5ms。排查之后发现，大量时间被花在了**等待获取连接**上。连接池默认配置完全不适合我们的并发量。

## 问题定位

用 \`mysql2\` 的 \`pool.getConnection()\` 加了耗时埋点之后，数据很直观：

| 指标 | 调优前 |
|------|--------|
| SQL 平均执行时间 | 4.2ms |
| 获取连接平均耗时 | 147ms |
| P99 获取连接耗时 | 621ms |
| 池中连接数峰值 | 10（默认上限） |

10 个连接面对每秒 200+ 请求，等待队列里排了长龙。

## 连接池核心参数

### max（最大连接数）

这是第一个要调的参数，但不能无脑设大——MySQL 服务端也有 \`max_connections\` 上限。

\`\`\`bash
# 先查 MySQL 服务端允许的最大连接数
mysql> SHOW VARIABLES LIKE 'max_connections';
+-----------------+-------+
| Variable_name   | Value |
+-----------------+-------+
| max_connections | 200   |
+-----------------+-------+
\`\`\`

经验公式：

\`\`\`
pool.max = (核心业务 QPS × 平均 SQL 耗时) × 1.2
\`\`\`

### idleTimeoutMillis（空闲回收）

连接空闲多久后被释放。我们最初设了 10 分钟，导致低谷期白白占着连接。

> 调整为 30000（30 秒）后，低谷期连接数从 20 降到了 5 左右。

### acquireTimeoutMillis（获取超时）

排队等待获取连接的时限。超时后直接抛错，避免请求无限堆积。

### queueLimit（排队上限）

等待队列最大长度。设为 0 表示不限制，设为 N 则超出后立即报错。

## 调优过程

第一步，把 \`max\` 从 10 提到 50：

\`\`\`js
const pool = mysql2.createPool({
  host: 'localhost',
  user: 'app',
  database: 'orders',
  max: 50,
  idleTimeoutMillis: 30000,
  acquireTimeoutMillis: 10000,
  queueLimit: 0,
})
\`\`\`

第二步，观察 MySQL 侧连接状态：

\`\`\`sql
SELECT COUNT(*) AS connections FROM information_schema.processlist WHERE user = 'app';
-- 峰值 42，远在 200 上限内，安全
\`\`\`

第三步，压测验证：

| 指标 | 调优前 | 调优后 |
|------|--------|--------|
| P50 | 184ms | 6ms |
| P99 | 237ms | 8ms |
| P99 获取连接耗时 | 621ms | 2ms |

## 注意事项

- **不要设得比 MySQL \`max_connections\` 还大**——所有实例加起来不能超过服务端上限。
- 配合应用层缓存（Redis）进一步降低数据库连接需求。
- 接入 Grafana 监控连接池状态，设 \`pool._allConnections.length\` 告警。

\`\`\`js
// 简易监控端点
app.get('/health/pool', (req, res) => {
  res.json({
    active: pool._allConnections.length - pool._freeConnections.length,
    idle: pool._freeConnections.length,
    waiting: pool._connectionQueue.length,
  })
})
\`\`\`

## 小结

连接池调优不是"参数越大越好"，而是要根据实际并发量和 MySQL 侧资源做精细平衡。核心公式：池大小 = QPS × SQL 耗时 × 缓冲系数。

如果你团队也有"慢查询不慢、接口就是慢"的症状，不妨先看一眼连接获取耗时，很多时候问题不在 SQL 身上。
`,"mongodb-aggregation-performance":`# MongoDB 聚合管道性能分析与索引优化

> 聚合管道是 MongoDB 最强大的特性之一，但也是性能陷阱的重灾区。本文通过 explain 输出逐段剖析一个慢查询的优化路径。

我们有个统计看板，每次打开都要等 6-8 秒。追下去发现是一个 \`$lookup\` + \`$group\` 的聚合管道在背锅。

## 原始管道

\`\`\`js
db.orders.aggregate([
  { $match: { createdAt: { $gte: ISODate("2024-01-01") } } },
  { $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "user" } },
  { $unwind: "$user" },
  { $lookup: { from: "products", localField: "items.productId", foreignField: "_id", as: "products" } },
  { $group: { _id: "$user.region", total: { $sum: "$amount" }, count: { $sum: 1 } } },
  { $sort: { total: -1 } },
])
\`\`\`

## explain 诊断

\`\`\`js
db.orders.explain("executionStats").aggregate([...])
\`\`\`

关键发现：

1. **\`$match\` 阶段走了 COLLSCAN**——\`createdAt\` 字段没有索引，扫描了 230 万行。
2. **两次 \`$lookup\` 分别在 \`users\` 和 \`products\` 表重复全表扫描**。
3. 内存排序（\`$sort\`）超出了 100MB 限制，触发磁盘临时文件。

## 优化步骤

### 第一步：加索引

\`\`\`js
db.orders.createIndex({ createdAt: -1, userId: 1 })
db.users.createIndex({ _id: 1, region: 1 })
db.products.createIndex({ _id: 1 })
\`\`\`

### 第二步：管道路由重排

将过滤越早越好，把 \`$match\` 放到最前，并在 \`$lookup\` 后用 \`$unset\` 去掉不需要的字段减少文档体积。

### 第三步：用 \`$lookup\` pipeline 替代简单写法

\`\`\`js
{
  $lookup: {
    from: "users",
    let: { uid: "$userId" },
    pipeline: [
      { $match: { $expr: { $eq: ["$_id", "$$uid"] } } },
      { $project: { region: 1 } }  // 只取需要的字段
    ],
    as: "user"
  }
}
\`\`\`

### 第四步：允许磁盘使用

如果排序数据量不可避免，开启 \`allowDiskUse\`：

\`\`\`js
db.orders.aggregate(pipeline, { allowDiskUse: true })
\`\`\`

> 这不是性能优化，而是"允许它慢而不是爆内存"的兜底。

## 优化效果

| 指标 | 优化前 | 优化后 |
|------|--------|--------|
| 扫描文档数 | 230 万 | 18 万 |
| 执行时间 | 7200ms | 120ms |
| 内存占用 | 380MB | 42MB |

## 小结

聚合性能优化的核心思路就三条：

1. **让 \`$match\` 最早命中索引**
2. **\`$lookup\` 只取需要字段**
3. **尽可能在管道早期减少文档体积**
`,"express-middleware-order":`# Express 中间件执行顺序的那些坑

> 一个看似正确的中间件注册顺序，可能让你排查半天权限问题。本文梳理 Express 中间件栈的洋葱模型与常见误用。

最常见的一个 bug：权限校验放在了路由处理之后，结果根本没执行——路由直接返回了响应，后面的中间件被跳过。

## 洋葱模型

Express 的中间件按照注册顺序形成一个调用栈。每个 \`next()\` 对应一次"进入下一层"，回来后是"从下一层出来"。

\`\`\`
request  →  [logger] → [auth] → [route handler] →  response
         ←          ←        ←                   
\`\`\`

关键细节：**如果某个中间件返回了响应（res.send / res.json 等）但没有调 next()，后续中间件不会执行**。

## 最常见错误

### 错误的权限中间件位置

\`\`\`js
// ❌ 权限中间件在路由后面，完全不生效
app.get('/admin', (req, res) => { res.json({ ok: true }) })
app.use(authMiddleware)
\`\`\`

### 忘记 next()

\`\`\`js
// ❌ 日志中间件忘了 next()，请求卡死
app.use((req, res, next) => {
  console.log(req.method, req.url)
  // 漏了 next()!
})
\`\`\`

### 异步中间件不处理错误

\`\`\`js
// ❌ 异步错误不会自动传递给 Express 错误处理
app.use(async (req, res, next) => {
  const data = await fetchSomething() // 如果 reject，请求会挂起
  req.data = data
  next()
})

// ✅ 需要显式 catch
app.use(async (req, res, next) => {
  try {
    req.data = await fetchSomething()
    next()
  } catch (err) {
    next(err)
  }
})
\`\`\`

## 推荐的中间件顺序

\`\`\`
1. 通用中间件（helmet / cors / compression）
2. 日志 / 请求追踪（morgan / trace-id）
3. body 解析（express.json / express.urlencoded）
4. 静态文件（express.static）
5. 认证 / 鉴权（authMiddleware）
6. 业务路由（app.use('/api', apiRouter)）
7. 404 处理
8. 全局错误处理（err, req, res, next）
\`\`\`

## 错误处理中间件

Express 区分"普通中间件"和"错误处理中间件"的唯一方式就是**参数个数**——四个参数的才是错误处理器：

\`\`\`js
// 全局错误处理一定是最后注册的
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Internal Server Error' })
})
\`\`\`

## 小结

Express 中间件的心智模型就记住一个比喻：**剥洋葱**。请求从外往里走，响应从里往外回。顺序错了，洋葱就剥反了——外面那层永远碰不到里面。
`,"openspec-getting-started":`# openSpec 入门：用规格文件驱动 AI 编码

> 当 AI 编码助手开始接手真实项目，最大的问题不是"写不出代码"，而是"写出的代码你我都不认得"。openSpec 用一份人类可读的规格文件，把意图锁死在代码之前。

过去一年，几乎所有团队都试过用 AI 写代码。它能补齐样板、生成测试用例、解释报错——效率提升是真实的。但一旦离开"玩具项目"，进入有历史包袱、有隐式约定的代码库，AI 生成的内容就开始**漂移**：接口字段对不上、命名风格各一、边界条件被忽略。

问题不在模型不够强，而在于我们从未把"这一次要做什么、做成什么样"清楚地交代给模型。openSpec 想解决的，正是这道**意图断层**。

## 为什么需要规格文件

把需求写进一段 prompt，模型只能看到你当下敲进去的那几行。它不知道项目里已经存在 \`UserRepository\`，不知道你们约定用 \`snake_case\` 还是 \`camelCase\`，更不知道这个改动不能破坏上个月的支付回调。

> 规格文件不是为了"指挥"AI，而是为了给 AI 一个稳定、可复用的上下文契约——人读得懂，机器也读得懂。

一份好的规格，应该能被提交进 Git、被 Code Review、被 CI 校验。它和代码一样，是第一等公民。

## openSpec 的核心概念

openSpec 的设计极度克制，整个体系围绕三个对象展开。理解它们，就理解了 openSpec 的工作方式。

### 三个核心对象

理解 openSpec，先抓住它刻意保持精简的三元组。它们各司其职，又彼此衔接：

#### Spec（规格）

描述一个功能"要做什么"，是人类与模型之间的契约。它不关心语言、框架或实现细节，只回答"目标"与"边界"，是整条链路里最稳定、最该被反复推敲的一份文件。

#### Task（任务）

把 Spec 拆成可执行的步骤，每一步都能独立验证。Task 是规格落地的阶梯，让大模型可以小步前进、随时回滚，也让你清晰地看到"进度到哪了"。

#### Archive（归档）

已完成的 Spec 不会消失，而是沉淀为项目的"决策地图"。下次有人问"当年为什么这么设计"，答案就躺在归档里，而不是散落在某次聊天的上下文窗口中。

### 设计哲学

三个对象背后，是两条贯穿始终、且互相约束的设计原则：

#### 最小可用

一份 Spec 只要能说清"问题"和"验收标准"就够了。多余的措辞只会成为模型发挥时的噪音，也更容易在 Review 时掩盖真正的关键约束。

#### 人类可读

规格必须人读得懂，才会有人去 Review；有人 Review，它才配得上进入版本控制。可读性是它生命力的来源，也是它区别于"又一段提示词"的根本。

:::tip 小提示
不要把 Spec 写成实现细节。它回答"做什么"和"为什么"，实现留给 Task 和模型去填。
:::

一份最小可用的 Spec 长这样：

\`\`\`yaml
# specs/add-user-rate-limit/spec.md
description: 为公开 API 增加基于令牌桶的限流
why: 近期爬虫导致服务波动，需在不引入新依赖的前提下保护核心接口
acceptance:
  - 单 IP 默认上限 100 请求/分钟
  - 超限返回 429 与 Retry-After 头
  - 限流状态可从 /health 暴露
\`\`\`

## 从零开始一个规格

初始化一个项目只需要一行命令，它会创建 \`openspec/\` 目录与基础结构：

### 初始化项目

openSpec 对环境几乎零要求，几条命令即可在任意 Node 项目里落地，无需改造现有工程结构。

#### 安装

推荐以 \`npx\` 方式直接使用，避免污染全局依赖；如果团队使用频繁，也可以作为 \`devDependency\` 安装到项目里统一版本。

#### 目录结构

初始化后会在仓库根生成 \`openspec/\` 目录，其中 \`specs/\` 存放草稿与进行中的规格，\`archive/\` 存放已交付的规格，二者共同构成项目的决策历史。

### 打磨 Spec

生成只是起点，真正决定质量的是反复打磨的过程。下面这份清单能帮你把"能跑"的草稿，变成"敢进主干"的规格。

#### 检查清单

提交前，建议逐条核对以下内容，确认规格"说人话、可验证"：

\`\`\`bash
# 初始化
npx openspec init

# 基于自然语言需求生成一个 Spec 草稿
npx openspec propose "给公开 API 加上限流"
\`\`\`

生成后，建议按下面的顺序打磨它：

1. 读一遍 \`description\`，确认它说的是"问题"而非"方案"。
2. 检查 \`acceptance\` 是否可验证——每条都应能用一句话判断通过与否。
3. 把草稿提交到分支，发起一次普通的 Pull Request。

> 图：Spec → Task → 代码的单向流动，意图始终可追溯。

## 在 CI 中校验规格

规格的价值在于"活着"。把它接进 CI，每次提交都校验 Spec 与代码是否偏离：

\`\`\`yaml
# .github/workflows/openspec.yml
name: openspec
on: [pull_request]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx openspec validate
\`\`\`

当 CI 变红，说明有人改了代码却忘了同步 Spec——这恰恰是它最该发挥作用的时候。

## 小结

openSpec 不是另一个"魔法提示词"，而是一种**把上下文工程化的习惯**。它把"我们到底要什么"从飘忽的对话里拽出来，钉进版本控制系统。

如果你也受够了 AI 生成的代码"看着对、跑起来错"，不妨从下一个小功能开始，先写 Spec，再写代码。
`,"llm-inference-kv-cache":`# 大模型推理优化实战：KV Cache 与批处理

> 吞吐量和首字延迟往往是矛盾的，而 KV Cache 与连续批处理是化解矛盾的关键。本文记录一次线上推理服务的优化复盘。

我们的 LLM 推理 API 上线后遇到了典型的两难：要么单次请求很快但并发一高就崩，要么能扛高并发但每个用户等 5 秒才吐出第一个字。

## 什么是 KV Cache

Transformer 在自回归生成时，每个新 token 都需要对**所有历史 token** 做注意力计算。如果不缓存 K/V 矩阵，每生成一个 token 就要重算全部历史，复杂度 O(n²)。

KV Cache 的思路很简单：

> 每算出一个新 token，就把它的 Key/Value 矩阵存起来。下次只需要对新 token 做注意力的增量计算。

\`\`\`python
# 伪代码：有 KV Cache vs 无 KV Cache
# 无缓存：每步重新算 full attention
output = model(input_ids)  # O(n²)，每次都算全部

# 有缓存：只算当前 token 的注意力
past_kv = cache.get()
output = model(new_token, past_key_values=past_kv)  # O(n)
cache.update(output.kv)
\`\`\`

## 连续批处理（Continuous Batching）

传统静态批处理的问题：

- 必须等到 batch 里**所有**请求都生成完毕才返回
- 短的回复被长的拖后腿

连续批处理动态调整 batch：

\`\`\`
时刻 T1: [ReqA(生成了 3 个token), ReqB(刚提交)]
时刻 T2: [ReqA(生成了 4 个token), ReqB(生成了 1 个token)]  
时刻 T3: [ReqA 已完成，移除], [ReqB(生成了 2 个token), ReqC(刚提交)]
\`\`\`

### 实现要点

\`\`\`python
class ContinuousBatcher:
    def __init__(self):
        self.active_requests = []  # 当前正在处理的请求
    
    def step(self):
        # 1. 组装当前 batch 的输入
        inputs = self._prepare_inputs()
        
        # 2. 一次 forward 产生下一个 token
        outputs = model.generate(inputs, max_new_tokens=1)
        
        # 3. 检查哪些请求已完成，移除它们
        self.active_requests = [
            r for r in self.active_requests
            if not r.is_finished()
        ]
        
        # 4. 如果有空位，从等待队列补充新请求
        while len(self.active_requests) < self.max_batch_size:
            new_req = self.waiting_queue.pop()
            self.active_requests.append(new_req)
\`\`\`

## 优化结果

| 指标 | 优化前（静态 Batch） | 优化后（连续 Batch + KV Cache） |
|------|---------------------|-------------------------------|
| 单请求首字延迟 | 2.1s | 0.3s |
| 并发 50 时吞吐 | 120 tokens/s | 480 tokens/s |
| GPU 利用率 | 42% | 89% |
| P99 延迟 | 8.7s | 1.6s |

## 小结

KV Cache 消除冗余计算，连续批处理消除空闲等待。两者结合，是把一块 GPU 从"摸了半天"变成"忙得有价值"的关键。
`,"react-class-to-hooks":`# 从 Class 到 Hooks：一次 React 状态管理的迁移复盘

> Hooks 让组件逻辑复用变得优雅，但也带来闭包陷阱与依赖管理的隐性成本。本文复盘我们把一个中等规模应用从 Class 组件迁到函数组件的全过程。

迁移的初衷很简单：越来越多的第三方库只提供 Hooks 版本（Router v6、Redux Toolkit 等），我们的 Class 组件越来越像二等公民。

## 迁移策略

我们没有一步到位全部重写，而是按组件树的"叶子 → 根"方向逐步迁：

### 第一阶段：无状态组件

从纯展示组件开始，零风险：

\`\`\`jsx
// Before: Class
class UserAvatar extends React.Component {
  render() {
    return <img src={this.props.src} alt={this.props.name} />
  }
}

// After: Function
function UserAvatar({ src, name }) {
  return <img src={src} alt={name} />
}
\`\`\`

### 第二阶段：类生命周期 → Hooks

这是最容易出错的一步，尤其 \`componentDidMount\` → \`useEffect\` 的语义不完全等价：

\`\`\`jsx
// Before: Class
class UserProfile extends React.Component {
  state = { user: null, loading: true }
  
  componentDidMount() { this.fetchUser(this.props.id) }
  componentDidUpdate(prevProps) {
    if (prevProps.id !== this.props.id) this.fetchUser(this.props.id)
  }
  
  fetchUser = async (id) => {
    this.setState({ loading: true })
    const user = await api.getUser(id)
    this.setState({ user, loading: false })
  }
}

// After: Hooks
function UserProfile({ id }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api.getUser(id).then(u => { if (!cancelled) setUser(u) })
    return () => { cancelled = true }  // 竞态清理
  }, [id])
}
\`\`\`

## 踩过的坑

### 闭包陷阱

\`\`\`jsx
// ❌ 闭包捕获了旧的 count 值
function Counter() {
  const [count, setCount] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setCount(count + 1), 1000)
    return () => clearInterval(timer)
  }, [])  // 空依赖，count 永远是 0
}

// ✅ 用函数式更新
useEffect(() => {
  const timer = setInterval(() => setCount(c => c + 1), 1000)
  return () => clearInterval(timer)
}, [])
\`\`\`

### useCallback 滥用

不是每个函数都需要包 \`useCallback\`。它只在作为依赖传递给 \`useEffect\` 或子组件的 \`React.memo\` 时才有意义。

### 自定义 Hook 提取

迁移最大的收益来自这一步——我们把散落在 8 个组件的表单验证逻辑抽成了一个 \`useFormValidation\`。

## 小结

Hooks 的价值不在语法糖，而在**让逻辑得以跨组件复用**。迁移时从叶子组件开始、为异步操作加竞态取消、不用纠结于完全去掉 Class——它们可以共存。
`,"go-generics-config-parser":`# 用 Go 泛型重写我们的配置解析库

> Go 1.18 引入的泛型终于让我们告别了满屏的 reflect。本文记录配置库在引入泛型后的类型安全性提升与一小撮性能回退的权衡。

之前的库长得像这样——到处是 \`interface{}\` 和类型断言：

\`\`\`go
// 旧版：reflect + interface{}
func GetConfig(key string) (interface{}, error) {
    val := store[key]
    return val, nil  // 调用方必须做类型断言
}

// 调用方：
port, ok := GetConfig("port").(int)  // panic 风险
\`\`\`

编译期什么都检查不了，把所有锅甩给了运行时。

## 泛型化设计

\`\`\`go
// 新版：泛型配置读取器
type ConfigStore[V any] struct {
    mu   sync.RWMutex
    data map[string]V
}

func New[V any]() *ConfigStore[V] {
    return &ConfigStore[V]{data: make(map[string]V)}
}

func (c *ConfigStore[V]) Get(key string) (V, error) {
    c.mu.RLock()
    defer c.mu.RUnlock()
    val, ok := c.data[key]
    if !ok {
        var zero V
        return zero, fmt.Errorf("key %q not found", key)
    }
    return val, nil
}
\`\`\`

调用方现在是类型安全的：

\`\`\`go
store := config.New[int]()
store.Set("port", 8080)
port, err := store.Get("port")  // port 是 int，编译期确定
\`\`\`

## 类型约束进阶

不是所有类型都适合做配置值。我们用接口约束限定支持的类型：

\`\`\`go
type ConfigValue interface {
    int | string | bool | float64 | time.Duration
}

type TypedStore[V ConfigValue] struct {
    store *ConfigStore[V]
}
\`\`\`

## 性能对比

用基准测试跑一万次 Get 操作：

\`\`\`
BenchmarkOldReflect-8    4521000    263 ns/op    48 B/op
BenchmarkNewGeneric-8   18960000     61 ns/op     0 B/op
\`\`\`

泛型版本反而更快——没有 reflect 的动态分配的锅。

## 小结

Go 泛型的精髓不在"支持更多写法"，而在**把原本运行时的类型检查提前到了编译期**。对于配置解析这类边界层代码，收益远超学习成本。
`,"postgresql-partitioned-orders":`# PostgreSQL 分区表在我们的订单系统上的落地

> 当单表突破两亿行，查询计划开始失控。本文介绍我们如何用声明式分区把 P99 延迟从 1.2s 压到 80ms，以及迁移期间的一致性保障。

订单表 \`orders\` 从上线起每月增长 300 万行。第二年底，一切开始变慢——即使索引还在，查询计划也开始选择全表扫描。

## 诊断

\`\`\`sql
SELECT relname, n_live_tup, n_dead_tup, 
       pg_size_pretty(pg_total_relation_size(relid)) AS size
FROM pg_stat_user_tables
WHERE relname = 'orders';
\`\`\`

| 表名 | 行数 | 大小 |
|------|------|------|
| orders | 2.1 亿 | 87 GB |

\`EXPLAIN ANALYZE\` 显示即使有 \`created_at\` 索引，查询一个月的订单仍在扫描所有分区不可用的旧数据。

## 分区方案

按 \`created_at\` 月分区，使用 PG 12+ 的声明式分区：

\`\`\`sql
CREATE TABLE orders (
    id           BIGSERIAL,
    user_id      BIGINT NOT NULL,
    amount       DECIMAL(10,2),
    status       VARCHAR(20),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
) PARTITION BY RANGE (created_at);

-- 按月创建分区
CREATE TABLE orders_2024_01 PARTITION OF orders
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE orders_2024_02 PARTITION OF orders
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
-- ...
\`\`\`

### 自动化创建分区

\`\`\`sql
-- 用 cron + pg_cron 每月初自动创建下月分区
CREATE OR REPLACE FUNCTION create_next_partition()
RETURNS void AS $$
DECLARE
    next_month date := date_trunc('month', now()) + interval '1 month';
    partition_name text;
BEGIN
    partition_name := 'orders_' || to_char(next_month, 'YYYY_MM');
    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF orders
         FOR VALUES FROM (%L) TO (%L)',
        partition_name,
        next_month,
        next_month + interval '1 month'
    );
END;
$$ LANGUAGE plpgsql;
\`\`\`

## 在线迁移

不能停服。方案：创建分区表 → 触发器双写 → 批量回填历史 → 切换。

\`\`\`sql
-- 双写触发器（过渡期）
CREATE OR REPLACE FUNCTION order_partition_trigger()
RETURNS trigger AS $$
BEGIN
    INSERT INTO orders_partitioned VALUES (NEW.*);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
\`\`\`

## 效果

| 指标 | 迁移前 | 迁移后 |
|------|--------|--------|
| P50 | 180ms | 12ms |
| P99 | 1200ms | 80ms |
| 表膨胀率 | 34% | 4% |
| VACUUM 耗时 | 4h+ | 2min/分区 |

## 小结

PostgreSQL 声明式分区用起来很简单，但迁移过程需要仔细规划一致性。关键原则：双写过渡、分批次回填、保留回滚窗口。
`,"rust-hot-path-rewrite":`# 用 Rust 重写热点路径：一次值得的 30 倍提速

> 借用检查器一开始让人头秃，但编译通过后几乎零运行时错误。本文分享我们把一个 CPU 密集的解析服务用 Rust 重写后的收益与踩坑。

我们的日志解析服务每天处理 50 亿行，Python 版本已经到了天花板——16 核跑到 90%，GC 暂停让延迟图表像心电图。

## 为什么是 Rust

考虑过的几个选项：

| 语言 | 优点 | 缺点 |
|------|------|------|
| Go | 简单、团队熟悉 | GC 在大内存场景仍有抖动 |
| C++ | 绝对性能 | 内存安全是持续的代价 |
| Rust | 零开销抽象 + 编译期保证 | 学习曲线陡峭 |

最终选 Rust 的核心原因：**零 GC + 零数据竞争 + 零空指针**。这三样正好是我们线上事故的三大来源。

## 核心解析逻辑

\`\`\`rust
use nom::IResult;
use nom::bytes::complete::{tag, take_until};
use nom::character::complete::{space0, u64};
use nom::sequence::tuple;

#[derive(Debug)]
struct LogEntry {
    timestamp: u64,
    level: String,
    message: String,
}

fn parse_log(input: &str) -> IResult<&str, LogEntry> {
    let (input, (ts, _, level, _, msg)) = tuple((
        u64, tag(" "), take_until(" "), space0, take_until("
"),
    ))(input)?;
    Ok((input, LogEntry {
        timestamp: ts,
        level: level.to_string(),
        message: msg.to_string(),
    }))
}
\`\`\`

\`nom\` 是零拷贝解析库，不会为每个字段分配新 String——处理完一行，下一行复用同一块栈内存。

## 并发模型

\`\`\`rust
use rayon::prelude::*;

fn parse_batch(lines: &[&str]) -> Vec<LogEntry> {
    lines.par_iter()
        .filter_map(|line| parse_log(line).ok())
        .map(|(_, entry)| entry)
        .collect()
}
\`\`\`

\`rayon\` 一行代码把迭代变成并行，自动按 CPU 核数分配工作。与 Python 的 GIL 相比，16 核真的跑满了 1600%。

## 性能对比

解析 100 万行日志：

| 实现 | 耗时 | 内存峰值 |
|------|------|----------|
| Python | 4.2s | 480MB |
| Python (PyPy) | 2.1s | 520MB |
| Rust (单线程) | 0.28s | 8MB |
| Rust (并行) | 0.09s | 12MB |

## 踩坑记录

### 生命周期标注

这是 Rust 新手杀手。一个简单的规则：**永远从返回引用的函数开始理解生命周期**。

### 错误处理

不要到处 \`unwrap()\`。尽早引入 \`anyhow\` 或 \`thiserror\` 做结构化错误。

### 编译速度

第一次 CI 拉了 200 个 crate 编译了 8 分钟。后来配了 \`sccache\`，增量编译降到 30 秒以内。

## 小结

Rust 最大的价值不在性能本身，而在于**把运行时的 bug 变成编译错误**。借用检查器逼你思考数据的所有权，而这个思考过程恰好是写出正确并发代码的前提。
`,"strategy-pattern-billing":`# 策略模式在计费规则引擎中的实战应用

> 当 if-else 嵌套超过三层，维护就成了噩梦。本文用一个真实的计费场景，演示如何用策略模式把数百行分支收敛成可插拔的规则单元。

我们的计费系统最初只有"按量计费"一种模式。后来加入了包年包月、阶梯定价、活动折扣……核心函数的 if-else 从 10 行涨到了 300 行。

## 问题

\`\`\`js
// 这是真实代码的简化版——已经不忍直视
function calculateFee(order) {
  if (order.type === 'on_demand') {
    return order.usage * pricePerUnit
  } else if (order.type === 'subscription') {
    if (order.tier === 'basic') return 99
    else if (order.tier === 'pro') return 299
    else return 999
  } else if (order.type === 'tiered') {
    if (order.usage <= 100) return order.usage * 0.5
    else if (order.usage <= 1000) return 50 + (order.usage - 100) * 0.4
    else return 50 + 360 + (order.usage - 1000) * 0.3
  } else if (order.type === 'promotion') {
    // 还有 5 种促销规则...
  }
}
\`\`\`

每次上线新计费方式，就在这个函数尾部加一个 else-if。没有人敢重构它。

## 策略模式重构

\`\`\`ts
interface BillingStrategy {
  name: string
  calculate(order: Order): number
  isApplicable(order: Order): boolean
}

class OnDemandStrategy implements BillingStrategy {
  name = 'on_demand'
  
  isApplicable(order: Order): boolean {
    return order.type === 'on_demand'
  }
  
  calculate(order: Order): number {
    return order.usage * order.unitPrice
  }
}

class TieredStrategy implements BillingStrategy {
  name = 'tiered'
  private tiers = [
    { max: 100, rate: 0.5 },
    { max: 1000, rate: 0.4 },
    { max: Infinity, rate: 0.3 },
  ]
  
  isApplicable(order: Order): boolean {
    return order.type === 'tiered'
  }
  
  calculate(order: Order): number {
    let remaining = order.usage
    let total = 0
    for (const tier of this.tiers) {
      const used = Math.min(remaining, tier.max)
      total += used * tier.rate
      remaining -= used
      if (remaining <= 0) break
    }
    return total
  }
}
\`\`\`

### 引擎

\`\`\`ts
class BillingEngine {
  private strategies: BillingStrategy[] = []
  
  register(strategy: BillingStrategy) {
    this.strategies.push(strategy)
  }
  
  calculate(order: Order): number {
    const strategy = this.strategies.find(s => s.isApplicable(order))
    if (!strategy) throw new Error(\`No strategy for order type: \${order.type}\`)
    return strategy.calculate(order)
  }
}
\`\`\`

## 效果

| 维度 | 重构前 | 重构后 |
|------|--------|--------|
| 核心函数行数 | 312 | 18 |
| 新增计费方式成本 | 改核心函数 + 回归 | 新增一个类 + 注册 |
| 单元测试覆盖 | 17%（不敢改） | 94%（每个策略独立测） |
| 上线新规则的 Bug 率 | 平均 2.3 个/次 | 0（近 6 次） |

## 小结

策略模式的核心价值不是"优雅"，而是**把"改什么"从"改哪里"中解放出来**。新增计费规则不再需要碰核心引擎——注册一个新策略就完成上线。
`,"rest-to-grpc":`# 从 REST 到 gRPC：内部服务通信的协议演进

> Protobuf 的强类型契约让前后端联调少了一半扯皮。本文记录我们把核心链路从 JSON REST 切换到 gRPC 的动机、改造步骤与回归教训。

每次新同事加入，第一件事就是到处问"这个字段拼 camelCase 还是 snake_case"。JSON 的自由是好事，但也是灾难。

## 为什么换

我们的微服务从 3 个长到了 12 个，内部互调频率急剧上升：

| 问题 | REST JSON 的表现 |
|------|-----------------|
| 字段命名不一致 | 有的用 \`userId\`，有的用 \`user_id\` |
| 类型丢失 | 金额是 string 还是 number？全靠约定 |
| 文档滞后 | Swagger 和实际接口经常不同步 |
| 序列化开销 | 大列表 JSON 解析占请求耗时的 12% |

## Proto 定义

\`\`\`protobuf
syntax = "proto3";

package order.v1;

service OrderService {
  rpc CreateOrder(CreateOrderRequest) returns (CreateOrderResponse);
  rpc GetOrder(GetOrderRequest) returns (Order);
}

message CreateOrderRequest {
  int64 user_id = 1;
  repeated OrderItem items = 2;
  string coupon_code = 3;
}

message OrderItem {
  string product_id = 1;
  int32 quantity = 2;
  int64 unit_price = 3;  // 单位：分
}
\`\`\`

\`\`\`bash
# 生成 Go 代码
protoc --go_out=. --go-grpc_out=. order.proto
\`\`\`

生成的代码自带类型安全的 Client/Server 接口——找不到 \`uint_price\` 这种拼写错误在编译期就暴露了。

## 渐进式迁移

我们没有一刀切，而是按这个顺序：

1. **内部新服务直接上 gRPC**
2. **高频调用的老服务逐步切**
3. **对外网关层保留 REST → 内部转 gRPC**

\`\`\`go
// API Gateway 转一层
func (gw *Gateway) CreateOrder(w http.ResponseWriter, r *http.Request) {
    var req CreateOrderRequest
    json.NewDecoder(r.Body).Decode(&req)
    
    resp, err := gw.orderClient.CreateOrder(ctx, &req)
    // 返回 JSON
}
\`\`\`

## 翻过的车

### 默认值陷阱

Proto3 移除了 required/optional，所有字段都有默认值。**你无法区分"用户传了 0"和"用户没传"**。

\`\`\`protobuf
// Proto3 里这两种请求完全一样！
{ "discount": 0 }   // 用户明确设了 0
{ }                  // 用户没传
\`\`\`

解决：用 \`google.protobuf.WrapperValue\` 或业务层约定（负数表示未设置）。

### 连接管理

gRPC 基于 HTTP/2 长连接，需要正确处理连接池和重连逻辑，否则服务重启会导致大面积超时。

## 效果

| 指标 | REST | gRPC |
|------|------|------|
| 序列化耗时 | 0.8ms | 0.05ms |
| 有效载荷比 | 40% | 85% |
| 接口文档一致性 | 人肉同步 | 编译期强保证 |
| 联调扯皮时间 | 每周 3h+ | 基本为零 |

## 小结

gRPC 不是 REST 的替代品，而是**内部服务通信**的最佳实践。对于外部 API，REST + JSON 仍然是更友好的选择——网关层做翻译就好。
`,"k8s-hpa-cost-cut":`# 我们如何用 K8s HPA 把成本砍掉 40%

> 盲目给 Pod 配大资源请求，是云账单失控的主因。本文拆解我们基于自定义指标的弹性伸缩方案，以及如何避免抖动导致的频繁重启。

我们的生产集群月账单从 8 万涨到 23 万，只用了半年。而同时 CPU 平均利用率只有 18%。

## 诊断

第一步，拉取资源实际用量：

\`\`\`bash
kubectl top pods -n production --sort-by=cpu
\`\`\`

结果显示 85% 的 Pod 实际使用不到 \`requests\` 的 30%，但调度器按 requests 预留了全量资源——大量浪费。

## 典型配置错误

\`\`\`yaml
# ❌ 大手大脚的配置
resources:
  requests:
    cpu: "4"
    memory: "8Gi"
  limits:
    cpu: "4"
    memory: "8Gi"  # requests == limits，HPA 无法基于利用率伸缩
\`\`\`

## 正确姿势

### 第一步：requests 设到真实用量的 1.2 倍

\`\`\`yaml
resources:
  requests:
    cpu: "500m"     # 从 4 降到 0.5
    memory: "1Gi"   # 从 8Gi 降到 1Gi
  limits:
    cpu: "2"        # limits 可以高于 requests 允许弹性
    memory: "4Gi"
\`\`\`

### 第二步：配置 HPA

\`\`\`yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300  # 5 分钟稳定窗口，防抖动
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
    scaleUp:
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
\`\`\`

### 第三步：自定义指标

CPU 利用率不是万能的。我们的消息队列消费者 CPU 很低但队列积压严重：

\`\`\`yaml
  - type: External
    external:
      metric:
        name: queue_depth
      target:
        type: AverageValue
        averageValue: "100"
\`\`\`

## 防止抖动

扩缩太快导致的震荡比不扩还糟糕：

| 策略 | 配置 |
|------|------|
| 扩容快缩容慢 | scaleUp: 15s, scaleDown: 300s |
| 缩容按比例而非数量 | 每次缩 10% 而非 2 个 Pod |
| 设 minReplicas | 至少保留 2 个 Pod 扛突发 |

## 效果

| 指标 | 调优前 | 调优后 |
|------|--------|--------|
| 月成本 | 23 万 | 13.5 万 |
| CPU 利用率 | 18% | 68% |
| P99 延迟 | 210ms | 240ms（微增，可接受） |
| Pod 变配次数 | — | < 3 次/天 |

## 小结

HPA 省钱的核心不在于"多复杂"，而在于 **requests 要设对**。不合理的 requests 是一切浪费的根源，HPA 只是把省下来的空间变现。
`,"prometheus-alert-fatigue":`# Prometheus 告警疲劳治理：从 200 条到 12 条

> 告警不是越多越好。本文分享我们如何用 SLO 驱动的告警分层，把噪音告警砍掉九成，让 oncall 重新睡上安稳觉的实践。

值班群里每天 200+ 条告警，但真正需要半夜起床处理的一个月不超过 3 次。大家已经练就了"看标题就关掉"的本能——告警完全失效了。

## 症状

\`\`\`promql
# 当前：每台机器 CPU 超过 80% 就报警
avg(rate(node_cpu_seconds_total{mode="user"}[5m])) by (instance) > 0.8
\`\`\`

20 台机器，每台一个告警。而实际上只要集群整体还有余量，单台高负载完全不需要人介入。

## 治理框架

我们引入了 SRE 的核心理念：**只对用户可感知的痛苦报警**。

### 告警分层

| 层级 | 定义 | 通知方式 | 数量 |
|------|------|----------|------|
| P0 | SLO 正在被突破 | 电话 + 企微 | 3 条 |
| P1 | SLO 未来 1h 会被突破 | 企微 + 邮件 | 5 条 |
| P2 | 趋势偏离，暂未威胁 SLO | 邮件 | 4 条 |
| P3 | 技术指标异常 | 仅仪表盘，不通知 | 废弃 180 条 |

### P0 示例——SLO 燃烧速率

\`\`\`promql
# 错误预算消耗速度：过去 1h 消耗了 2% 以上的月度预算
(
  sum(rate(http_requests_total{status=~"5.."}[1h]))
  /
  sum(rate(http_requests_total[1h]))
) > (0.02 * 30 * 24)  # 按照这个速度，30 天内会耗尽预算
\`\`\`

关键：**用错误预算消耗率替代绝对值**。10 个错误在 QPS 100 和 QPS 10000 的场景下意义完全不同。

### P1 示例——错误率回归

\`\`\`promql
# 当前错误率是过去 7 天同时段中位数的 3 倍
(
  rate(http_requests_total{status=~"5.."}[5m])
  /
  rate(http_requests_total[5m])
) > 3 * avg_over_time(
  rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])
  [7d]
)
\`\`\`

### P2 示例——磁盘预测

\`\`\`promql
# 4 小时内磁盘会满
predict_linear(node_filesystem_free_bytes{mountpoint="/"}[1h], 4 * 3600) < 0
\`\`\`

这条会发邮件但不会打电话——磁盘满之前有充分时间处理。

## Alertmanager 路由

\`\`\`yaml
routes:
  - match:
      severity: P0
    receiver: oncall-phone
    repeat_interval: 5m
    
  - match:
      severity: P1
    receiver: team-channel
    repeat_interval: 30m
    
  - match:
      severity: P2
    receiver: weekly-digest
    group_wait: 1h
\`\`\`

## 效果

| 指标 | 治理前 | 治理后 |
|------|--------|--------|
| 日均告警 | 217 条 | 8 条 |
| 告警响应率 | < 5% | > 90% |
| MTTR（平均修复时间） | 47min | 12min |
| oncall 满意度 | 2.1/5 | 4.5/5 |

## 小结

治理告警疲劳的核心不是"设更坏的阈值"，而是**换一个维度——从技术指标切换到用户影响**。每条告警都应当回答同一个问题：用户正在经历痛苦吗？
`,"testing-pyramid-revisited":`# 让单测真正有用：我们团队的测试金字塔回归

> 一堆互相依赖的集成测试跑一次要 40 分钟。本文记录我们如何把测试重心移回快速单测，并把覆盖率指标从"虚荣数字"变成"真实护栏"。

我们的 CI 跑一次 40 分钟，PR 从提交到合入平均要等 4 轮。回头看测试构成：单测 12%，集成测试 85%，端到端 3%——测试金字塔完全倒挂。

## 倒挂的代价

- 修改一个字段，82 个集成测试炸掉，一修就是半小时
- 单测覆盖率 91% 但全是 \`expect(func()).toBe(undefined)\` 级别的无用断言
- 没人敢删测试——因为不知道哪个"碰巧"覆盖了真实 bug

## 重构策略

### 删除无效单测

\`\`\`ts
// ❌ 这种测试删掉
describe('add', () => {
  it('should not throw', () => {
    expect(() => add(1, 2)).not.toThrow()
  })
})

// ✅ 有用的测试
describe('add', () => {
  it('should handle negative numbers', () => {
    expect(add(-1, -2)).toBe(-3)
  })
  it('should handle Number.MAX_SAFE_INTEGER edge case', () => {
    expect(() => add(Number.MAX_SAFE_INTEGER, 1)).not.toThrow()
  })
})
\`\`\`

一刀原则：**测试名里看不出"测什么边界"的，直接删**。

### 集成测试瘦身

把 85% 的集成测试按这个标准审视：

> 这个测试的失败，能否精确指向一个具体的模块？

如果答案是"不能"，它应该在单测层。集成测试只保留"真实的外部依赖交互"——数据库连接、消息队列、第三方 API。

### 契约测试替代部分 E2E

\`\`\`ts
// 不启动完整服务，只验证 API 契约
test('GET /users/:id returns 200 with valid user', async () => {
  const { req, res } = createMocks({ method: 'GET', query: { id: '123' } })
  await handler(req, res)
  expect(res.statusCode).toBe(200)
  expect(res._getJSONData()).toMatchSchema(userSchema)
})
\`\`\`

## 分层策略

| 层 | 占比 | 运行时间 | 失败时能定位到 |
|------|------|----------|---------------|
| 单元测试 | 70%+ | < 2min | 具体函数 |
| 集成测试 | 25% | 5min | 具体模块边界 |
| E2E | 5% | 10min | 整个流程 |

## 效果

| 指标 | 重构前 | 重构后 |
|------|--------|--------|
| 全量测试时间 | 40min | 8min |
| 单测数量 | 3800（含大量僵尸） | 1200（每一条有意义） |
| PR 平均合入轮数 | 4.2 | 1.3 |
| 线上故障中"测试没抓到"的比例 | 62% | 14% |

## 小结

测试的金字塔不是代码量的金字塔，而是**信噪比**的金字塔。底层测逻辑、中层测集成、顶层测流程——顺序不能乱，否则再多测试也只是一堆慢速告警。
`,"distributed-training-scaling":`# 从单机到 8 卡：一次大模型训练的效率爬坡

> 数据并行简单，但通信开销会吃掉一半算力。本文拆解我们做梯度累积、混合精度与 ZeRO 优化的过程，把训练吞吐提升了 3.4 倍。

单卡 A100 跑 7B 模型，一个 checkpoint 要 18 小时。时间可以等，但实验迭代等不起。

## 并行策略选择

| 策略 | 适用场景 | 通信开销 |
|------|----------|----------|
| 数据并行（DP） | 模型能放进单卡 | 梯度 AllReduce |
| 模型并行（MP） | 模型放不进单卡 | 每层前向/反向都要通信 |
| 流水线并行（PP） | 模型大+层数多 | 相对低，但有气泡 |
| ZeRO | 介于 DP 和 MP 之间 | 梯度/参数分片通信 |

我们的 7B 模型勉强能放进单卡 A100（40GB），所以选 **ZeRO-2**：优化器状态和梯度分片，参数保留完整副本。

## ZeRO 级别对比

\`\`\`
ZeRO-1: 切分 Optimizer States    → 省 4x 显存
ZeRO-2: + 切分 Gradients        → 省 8x 显存  
ZeRO-3: + 切分 Parameters       → 省 N x 显存（N = GPU 数）
\`\`\`

我们选 ZeRO-2，因为参数能放进单卡，不需要切分带来的额外通信。

## 梯度累积

原生每步都同步梯度，128 张卡的通信成本让人崩溃：

\`\`\`python
# 等价于 batch_size = 32 但每 4 个 micro-batch 才同步一次
training_args = TrainingArguments(
    per_device_train_batch_size=8,
    gradient_accumulation_steps=4,
    # 有效 batch = 8 * 4 * 8 卡 = 256
)
\`\`\`

## 混合精度（AMP）

\`\`\`python
training_args = TrainingArguments(
    fp16=True,  # 前向/反向用 FP16，权重更新保持 FP32
    # 显存减半，速度提升 2-3x，精度损失可忽略
)
\`\`\`

## 结果

| 指标 | 单卡 Baseline | 4 卡 DP | 8 卡 ZeRO-2 + AMP |
|------|-------------|---------|--------------------|
| 总训练时间 | 18.5h | 6.1h（效率 76%） | 5.4h（效率 87%） |
| 单卡显存 | 38GB | 38GB | 12GB |
| 吞吐 tokens/s | 820 | 2490 | 2820 |

## 坑

- **ZeRO 不是万能的**——模型太小（< 1B）ZeRO 的通信开销反而拖后腿。
- **AMP 下 loss scale 需要监控**——loss 突然变成 NaN 通常是 scale overflow。
- **梯度累积步数不是越多越好**——超过一定值 BatchNorm 行为会偏移。

## 小结

分布式训练的优化路径：先让单卡跑起来 → 梯度累积撑大有效 batch → 混合精度省显存 → ZeRO 多卡扩展。按这个顺序，每一步都能单独验证收益。
`,"negative-space-aesthetics":`# 留白不是空白：东方美学中的负空间

> 留白是中国传统艺术的核心语言，在现代界面设计中同样是控制信息层级与视觉焦点的关键手段。

很多人以为"留白"就是"什么都不放"。恰恰相反——留白是最昂贵的元素，只有最重要的内容才配得上被它包围。

## 留白的三个层次

### 微观留白（Micro Whitespace）

字间距、行高、列表项之间。它影响"能不能轻松读下去"。

> 正文行高通常设 1.6-1.8，列表项间距 8-12px。这条线以下，信息糊成一团。

### 宏观留白（Macro Whitespace）

模块之间、区块之间。控制"先看哪里，再看哪里"。

一个反面案例是某些管理后台——三栏布局、每栏塞满表格和图表。用户最终什么都不看，靠 Ctrl+F 生存。

### 主动留白（Active Whitespace）

刻意引导视觉焦点。比如登录页的中间一个表单，周围大面积空白——这不是"省事"，而是"让用户只看表单"。

## 东方美学中的留白

南宋马远的《寒江独钓图》——整幅画只有一个渔翁和一条小船，剩下全是水。不是他不会画，是只有空白才能让"独"字成立。

界面设计同理——**信息层级不是靠"加粗放大"建立的，而是靠"周围有多安静"**。

## 实用原则

1. **留白和内容面积的比例至少 1:1**——这是最低底线。
2. **关联内容的间距小于无关内容的间距**——不需要分割线，间距本身就是语言。
3. **每增加一个元素，先问"去掉它用户会损失什么？"**——加东西永远比删东西容易。

## 小结

下次做设计评审，试着把"这里空太多了"换成"这里的内容值得被空白衬托吗？"——这是两种完全不同的思维方式。
`,"user-feedback-to-decision":`# 从用户反馈到产品决策的距离

> 用户反馈是产品的养分，但直接将反馈转化为需求往往是危险的。我们需要一套分类、验证与排序的机制。

"用户说要 A 功能，我们就做 A"——这是最偷懒也最危险的产品决策方式。

## 反馈分类

| 类别 | 比例 | 处理方式 |
|------|------|----------|
| Bug 报告 | 40% | 直接修复 |
| 使用困惑 | 25% | 改进交互/文案 |
| 功能请求 | 20% | 需要深度分析 |
| 情绪发泄 | 15% | 安抚，不据此决策 |

关键在于这 20% 的功能请求——它们是矿，但也可能指错方向。

## 功能请求的四步验证

### 第一步：理解背后的 Job to be Done

用户说"我要一个导出 Excel 的按钮"——深层需求可能是"我要把数据给别人看"。解决方案也许是分享链接而不是导出文件。

### 第二步：看行为而非听语言

用户说"这个功能很重要"，但看数据 80% 的人从来没用过。以行为数据为主，访谈为辅。

### 第三步：计算解决半径

一个需求能覆盖多少用户的多少痛苦？

\`\`\`
优先级 = 影响用户数 × 问题严重度 / 实现成本
\`\`\`

### 第四步：假说验证

不做完整功能，先用最廉价的方式验证假设：

> - 用人工操作替代自动流程，看用户是否真的需要  
> - 做一个静态页面测点击率  
> - 灰度 5% 看数据反馈

## 小结

从反馈到决策，中间的每一步都是在回答同一个问题：**我们是在解决用户说的问题，还是在解决用户真正有的问题？** 这两个答案经常不一样。
`,"designer-morning-ritual":`# 一个设计师的晨间仪式

> 清晨的一杯咖啡、十分钟的冥想和一页手写笔记，这些微小习惯如何影响一天的创造力与工作节奏。

以前我的早晨是：被闹钟吵醒 → 摸手机刷通知 → 被焦虑驱动着跳起来冲进一天。这样过了三年，我发现我的"灵感"越来越少——不是素材不够，是大脑从来没有安静过。

## 6:30 — 起床，不碰手机

手机晚上放在客厅充电。早晨第一件事不是刷通知，而是站在阳台看一会窗外——什么也不想。

> 创造力需要空白。就像画画需要画纸，构思需要一段不被填充的时间。

## 6:45 — 手冲一杯咖啡

不是胶囊机那种按一下就完事的——是磨豆、注水、等滤泡慢慢滴。整个过程大概 12 分钟。

这个仪式感的意义不在咖啡本身，而在于**用一件确定的、可控的小事开启一天**。它告诉大脑：今天的第一件事完成了，很好，继续。

## 7:00 — 十分钟冥想

不追求"什么都不想"，而是练习"注意到自己在想，然后轻轻回到呼吸"。

对我最直接的收益是：下午三四点面对第三版修改意见时，不那么容易炸了。

## 7:15 — 写一页笔记

不是待办清单。是用钢笔在空白本上随便写——昨天的一个有意思的小想法、刚刚做的梦、或者只是一句"今天没什么特别想写的"。

坚持三年下来，最意外的收获是：翻回去能看到自己思维方式的演变。那些"当时觉得很重要"的事，90% 半年后都不记得了。

## 小结

晨间仪式不是成功学，而是一种**在信息轰炸来临前，先把主动权拿回自己手里**的办法。不一定非要这四件事，但需要有一件让你在机器启动之前，先启动自己。
`,"eth-btc-differences":ce},de={class:"layout"},pe={key:0,class:"empty-hint"},me={key:1,class:"empty-hint"},ge={class:"breadcrumb","aria-label":"当前分类路径"},he={href:"#"},fe={class:"current"},Te={class:"article-title"},ye={key:0,class:"article-lead"},Ee=["innerHTML"],_e={key:1,class:"empty-hint"},Ce={key:2,class:"tags"},ke={class:"author-card"},ve={class:"avatar"},Pe={class:"a-name"},Ae={class:"toc"},be={"aria-label":"文章目录"},Se={class:"toc-list"},Re=["href","aria-current","onClick"],Oe={key:0},He=["href","aria-current","onClick"],Be={key:0},xe=["href","aria-current","onClick"],qe={key:0},Ie=["href","aria-current","onClick"],Me={__name:"ArticleDetailView",setup(we){const F=se(),W=re(),C=P(()=>F.params.slug),O=y(!0),H=y(!1),d=y({title:"",summary:"",content:"",coverImage:"",author:"",tags:[],categoryKey:"",createdAt:"",viewCount:0});async function w(){O.value=!0,H.value=!1;try{const t=await W.get(`/articles/slug/${encodeURIComponent(C.value)}`);d.value={title:t.title||"",summary:t.summary||"",content:t.content||"",coverImage:t.coverImage||"",author:t.author||"",tags:Array.isArray(t.tags)?t.tags:[],categoryKey:t.categoryKey||"",createdAt:t.createdAt||"",viewCount:t.viewCount||0}}catch(t){const e=ue[C.value]||"";d.value={title:le[C.value]||C.value,summary:"",content:e,coverImage:"",author:"林深",tags:[],categoryKey:"",createdAt:"",viewCount:0},t&&t.message==="文章不存在或未发布"&&(H.value=!0)}finally{O.value=!1}}const B=P(()=>d.value.title),z=P(()=>d.value.content),x=P(()=>ie(z.value)),L=y(0);function q(){const t=document.documentElement;L.value=t.scrollTop/(t.scrollHeight-t.clientHeight)*100}const g=y(null),G=y([]),h=y("");let I=new Map,N=new Map,f=null;function K(){if(!g.value)return[];const t=Array.from(g.value.querySelectorAll(".markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4")),e=new Map,p=new Map,a=new Map,n=[];let i=null,c=null,l=null;return t.forEach(u=>{let E=null;u.tagName==="H1"?(i=u.id,c=null,l=null):u.tagName==="H2"?(E=i,c=u.id,l=null):u.tagName==="H3"?(E=c,l=u.id):E=l||c;const M={id:u.id,text:u.textContent,children:[]};e.set(u.id,E),p.set(u.id,u),a.set(u.id,M);const V=E?a.get(E):null;V?V.children.push(M):n.push(M)}),I=e,N=p,G.value=n,t}function Q(){const t=K();f&&f.disconnect(),f=new IntersectionObserver(e=>{e.forEach(p=>{p.isIntersecting&&(h.value=p.target.id)})},{rootMargin:"-80px 0px -65% 0px",threshold:0}),t.forEach(e=>f.observe(e))}const Z=P(()=>{const t=new Set;let e=I.get(h.value);for(;e;)t.add(e),e=I.get(e);return t});function A(t){return{active:t===h.value,branch:Z.value.has(t)}}function b(t){const e=N.get(t);e&&e.scrollIntoView()}function U(t){const e=t.target.closest(".code-copy");if(!e)return;const p=e.closest(".code-block-wrap"),a=p&&p.querySelector("pre.code-block code");if(!a)return;const n=a.textContent||"",i=()=>{const l=e.textContent;e.textContent="已复制",e.classList.add("copied"),setTimeout(()=>{e.textContent=l,e.classList.remove("copied")},1500)};navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(n).then(i).catch(c):c();function c(){const l=document.createElement("textarea");l.value=n,l.style.position="fixed",l.style.opacity="0",document.body.appendChild(l),l.select();try{document.execCommand("copy"),i()}catch(u){}document.body.removeChild(l)}}return X(()=>{w(),window.addEventListener("scroll",q,{passive:!0}),q(),g.value&&g.value.addEventListener("click",U)}),j(C,()=>{w()}),j(x,()=>{requestAnimationFrame(Q)}),Y(()=>{window.removeEventListener("scroll",q),f&&f.disconnect(),f=null,g.value&&g.value.removeEventListener("click",U)}),(t,e)=>{const p=te("RouterLink");return o(),s(T,null,[r("div",{class:"progress",style:ee({width:L.value+"%"})},null,4),k(oe,{"active-key":""}),r("div",de,[r("article",{ref_key:"contentEl",ref:g,class:"article"},[k(p,{to:"/articles",class:"back-link"},{default:D(()=>[...e[0]||(e[0]=[r("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round","stroke-linejoin":"round"},[r("line",{x1:"19",y1:"12",x2:"5",y2:"12"}),r("polyline",{points:"12 19 5 12 12 5"})],-1),$(" 返回文章列表 ",-1)])]),_:1}),O.value?(o(),s("p",pe,"文章加载中…")):H.value?(o(),s("p",me,"找不到该文章，或文章尚未发布。")):(o(),s(T,{key:2},[r("nav",ge,[k(p,{to:"/articles"},{default:D(()=>[...e[1]||(e[1]=[$("文章",-1)])]),_:1}),e[2]||(e[2]=r("span",{class:"sep"},"/",-1)),r("a",he,m(d.value.categoryKey||"知识库"),1),e[3]||(e[3]=r("span",{class:"sep"},"/",-1)),r("span",fe,m(B.value),1)]),r("h1",Te,m(B.value),1),d.value.summary?(o(),s("p",ye,m(d.value.summary),1)):_("",!0),k(ne,{title:B.value,"cover-image":d.value.coverImage,ratio:"16/9","max-lines":3,class:"cover"},null,8,["title","cover-image"]),r("div",{class:"content markdown-body",innerHTML:x.value},null,8,Ee),x.value?_("",!0):(o(),s("p",_e,"该文章暂无正文内容。")),d.value.tags.length?(o(),s("div",Ce,[(o(!0),s(T,null,v(d.value.tags,a=>(o(),s("a",{key:a,href:"#",class:"tag"},m(a),1))),128))])):_("",!0),r("div",ke,[r("span",ve,m((d.value.author||"作")[0]),1),r("div",null,[r("div",Pe,m(d.value.author||"匿名作者"),1),e[4]||(e[4]=r("div",{class:"a-bio"},"知识库作者",-1))])])],64))],512),r("aside",Ae,[r("nav",be,[e[5]||(e[5]=r("div",{class:"toc-title"},"目录",-1)),r("ul",Se,[(o(!0),s(T,null,v(G.value,a=>(o(),s("li",{key:a.id},[r("a",{href:`#${a.id}`,class:R(A(a.id)),"aria-current":a.id===h.value?"location":void 0,onClick:S(n=>b(a.id),["prevent"])},m(a.text),11,Re),a.children.length?(o(),s("ul",Oe,[(o(!0),s(T,null,v(a.children,n=>(o(),s("li",{key:n.id},[r("a",{href:`#${n.id}`,class:R(A(n.id)),"aria-current":n.id===h.value?"location":void 0,onClick:S(i=>b(n.id),["prevent"])},m(n.text),11,He),n.children.length?(o(),s("ul",Be,[(o(!0),s(T,null,v(n.children,i=>(o(),s("li",{key:i.id},[r("a",{href:`#${i.id}`,class:R(A(i.id)),"aria-current":i.id===h.value?"location":void 0,onClick:S(c=>b(i.id),["prevent"])},m(i.text),11,xe),i.children.length?(o(),s("ul",qe,[(o(!0),s(T,null,v(i.children,c=>(o(),s("li",{key:c.id},[r("a",{href:`#${c.id}`,class:R(A(c.id)),"aria-current":c.id===h.value?"location":void 0,onClick:S(l=>b(c.id),["prevent"])},m(c.text),11,Ie)]))),128))])):_("",!0)]))),128))])):_("",!0)]))),128))])):_("",!0)]))),128))])])])]),k(ae)],64)}}},je=J(Me,[["__scopeId","data-v-2f9881af"]]);export{je as default};
