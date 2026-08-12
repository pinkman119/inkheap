<script setup>
import { inject } from 'vue'

defineProps({
  node: { type: Object, required: true },
})

const hasChildren = inject('catHasChildren')
const countUnder = inject('catCountUnder')
const isCollapsed = inject('catIsCollapsed')
const toggleNode = inject('catToggleNode')
const selectCategory = inject('catSelectCategory')
const onItemKeydown = inject('catOnItemKeydown')
const currentKey = inject('catCurrentKey')
</script>

<template>
  <li>
    <div
      class="tree-item"
      :class="{ active: currentKey === node.key }"
      role="button"
      tabindex="0"
      :aria-pressed="currentKey === node.key"
      :aria-expanded="hasChildren(node) ? String(!isCollapsed(node.key)) : undefined"
      @click="selectCategory(node)"
      @keydown="onItemKeydown($event, node)"
    >
      <span
        class="tree-toggle"
        :class="{ collapsed: isCollapsed(node.key), leaf: !hasChildren(node) }"
        aria-hidden="true"
        @click.stop="toggleNode(node)"
      >
        <svg
          v-if="hasChildren(node)"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </span>
      <span class="tree-label">{{ node.name }}</span>
      <span class="tree-count">{{ countUnder(node.key) }}</span>
    </div>

    <ul v-if="hasChildren(node)" v-show="!isCollapsed(node.key)" class="tree">
      <category-tree-node
        v-for="child in node.children"
        :key="child.key"
        :node="child"
      />
    </ul>
  </li>
</template>

<style>
/* 分类树样式（全局以命中递归子组件 DOM） */
.tree,
.tree ul {
  list-style: none;
}

.tree ul {
  margin-left: 14px;
  border-left: 1px solid var(--border);
  padding-left: 6px;
}

.tree li {
  margin: 2px 0;
}

.tree-item {
  display: flex;
  align-items: center;
  gap: 6px;
  position: relative;
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 14px;
  transition: background-color var(--transition), color var(--transition);
}

.tree-item:hover {
  background-color: var(--bg-card);
  color: var(--text-primary);
}

.tree-item.active {
  background-color: var(--accent);
  color: var(--bg-card);
}

.tree-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 60%;
  border-radius: 2px;
  background-color: var(--bg-card);
}

.tree-toggle {
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform var(--transition);
}

.tree-toggle.collapsed {
  transform: rotate(-90deg);
}

.tree-toggle.leaf {
  visibility: hidden;
}

.tree-count {
  margin-left: auto;
  font-size: 11px;
  padding: 1px 7px;
  border-radius: 10px;
  background-color: var(--bg-soft);
  color: var(--text-tertiary);
}

.tree-item.active .tree-count {
  background-color: var(--bg-card);
  color: var(--accent);
}

.tree-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
