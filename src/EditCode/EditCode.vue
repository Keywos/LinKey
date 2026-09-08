<template>
  <div class="edit-code-scroll">
    <h2
      class="edit-code-editor"
      :class="{ 'saves-open': showSaves }"
      style="
        -webkit-user-select: none;
        user-select: none;
        display: flex;
        justify-content: left;
        width: 90%;
        margin-top: -10px;
      "
    >
      <span
        class="edit-code-editor-title"
        style="opacity: 0.6" 
        @click="goFunction()"
        >Code Hub</span
      >
      <span class="edit-code-editor-toggle" @click.stop="toggleSaves">{{
        showSaves ? "▴" : "▾"
      }}</span>
      <div class="edit-code-editor-actions">
        <button
          class="edit-code-editor-add"
          type="button"
          title="新建"
          aria-label="新建"
          @click.stop="createNewBlank"
        >
          +
        </button>
      </div>
    </h2>

    <!-- 保存列表面板 -->
    <div v-if="showSaves" class="saves-panel">
      <div class="saves-body" :style="{ height: savesPanelHeight + 'px' }">
        <div class="saves-toolbar">
          <button class="saves-btn" @click="toggleToolbar">
            {{ toolbarExpanded ? "折叠" : "展开" }}
          </button>
          <!-- <button class="saves-btn" @click="createNewBlank">新建</button> -->
          <!-- <button class="saves-btn" @click="toggleTimeSort">
            {{ timeSortDescending ? "顺序" : "倒序" }}
          </button> -->
          <button class="saves-btn" @click="requestUrlContent">URL</button>
          <button class="saves-btn" @click="triggerImport">导入</button>
          <button class="saves-btn" @click="exportCurrent">导出</button>
          <button
            class="saves-btn"
            :disabled="syncingCodeHub"
            @click="openSyncModal"
          >
            {{ syncingCodeHub ? "同步中…" : "同步" }}
            <span
              v-if="syncDiffInfo && (syncDiffInfo.localNewCount > 0 || syncDiffInfo.remoteNewCount > 0)"
              class="saves-btn-badge"
            ></span>
          </button>

          <div v-if="toolbarExpanded" class="saves-toolbar-actions">
            <template v-if="selectMode">
              <button class="saves-btn" @click="toggleSelectMode">完成</button>
              <label class="saves-check-all">
                <input
                  type="checkbox"
                  :checked="allChecked"
                  @change="toggleCheckAll"
                />
                全选
              </label>
              <button
                class="saves-btn"
                :disabled="checkedIds.size === 0"
                @click="deleteSelected"
              >
                删除({{ checkedIds.size }})
              </button>
              <button
                class="saves-btn"
                :disabled="checkedIds.size === 0"
                @click="exportSelected"
              >
                导出选中({{ checkedIds.size }})
              </button>
            </template>

            <template v-else>
              <button class="saves-btn" @click="toggleSelectMode">选择</button>
              <button class="saves-btn" @click="toggleTimeSort">
                {{ timeSortDescending ? "顺序" : "倒序" }}
              </button>
              <button
                class="saves-btn"
                :disabled="syncingAllGists"
                @click="downloadAllGists"
              >
                {{ syncingAllGists ? "获取中…" : "GIST" }}
              </button>
              <div v-if="toolbarExpanded" class="saves-toolbar-search">
                <input
                  v-model="saveSearchQuery"
                  class="saves-search-input"
                  type="search"
                  placeholder=" 搜索"
                  @input="searchSavedContent"
                />
                <span v-if="searchingSavedContent" class="saves-search-status"
                  >搜索中…</span
                >
              </div>
            </template>
          </div>

          <div v-if="toolbarExpanded" class="saves-toolbar-filters">
            <span class="saves-filter-label">&nbsp; 筛选：</span>
            <button
              class="saves-filter-btn"
              :class="{ active: selectedTags.length === 0 }"
              @click="selectedTags = []"
            >
              全部
            </button>
            <button
              v-for="tag in availableTags"
              :key="tag"
              class="saves-filter-btn"
              :class="{ active: selectedTags.includes(tag) }"
              @click="toggleTagFilter(tag)"
            >
              {{ tag }}
            </button>
          </div>

          <input
            ref="importInputRef"
            type="file"
            style="display: none"
            @change="onImportFileChange"
          />
          <input
            ref="backupRestoreInputRef"
            type="file"
            accept=".zip,application/zip"
            style="display: none"
            @change="onBackupRestoreFileChange"
          />
        </div>
        <div ref="savesListRef" class="saves-list">
          <Transition name="saves-empty">
            <div
              v-if="!isLoadingSaves && savedItems.length === 0"
              class="saves-empty"
            >
              暂无保存的内容
            </div>
          </Transition>
          <template v-for="item in primarySavedItems" :key="item.id">
            <Transition name="saves-item" appear>
              <div
                :data-save-id="item.id"
                @click.stop="toggleItemActions(item)"
                class="saves-item"
                :class="{ 'saves-item-current': item.id === currentItemId }"
              >
                <input
                  v-if="selectMode"
                  type="checkbox"
                  :value="item.id"
                  v-model="checkedIds"
                  @click.stop
                />

                <div class="saves-item-info">
                  <span class="saves-item-name">
                    {{ item.name }}
                    <span
                      v-if="getItemChildrenCount(item) > 0"
                      class="saves-item-child-count"
                      >{{ getItemChildrenCount(item) + 1 + " 项" }}</span
                    >
                    <span
                      v-if="item.gist"
                      class="saves-item-source"
                      :title="gistPath(item)"
                      >{{ gistPath(item) }}</span
                    >
                    <span
                      v-if="item.tags?.length || isItemSynced(item)"
                      class="saves-item-tags"
                    >
                      <span
                        v-for="tag in item.tags"
                        :key="tag"
                        class="saves-item-tag"
                        :class="`saves-item-tag-${tag.toLowerCase()}`"
                        >{{ tag }}</span
                      >
                      <span
                        v-if="isItemSynced(item)"
                        class="saves-item-tag saves-item-tag-cf"
                        title="已同步至云端"
                      >
                        <img :src="cfsLogo" class="saves-item-cf-icon" alt="Cloud" />
                      </span>
                    </span>
                  </span>

                  <div class="saves-item-preview">
                    <span class="saves-item-content-preview">{{
                      item.preview || ""
                    }}</span>
                  </div>

                  <span class="saves-item-meta">
                    {{ formatTime(itemUpdatedAt(item)) }}
                    ·
                    {{ formatBytes(item.length) }}
                  </span>
                </div>

                <Transition :name="actionPanelsReady ? 'saves-actions' : ''">
                  <div
                    v-if="isItemActionsExpanded(item)"
                    class="saves-item-sync-actions"
                  >
                    <div class="saves-item-sync-actions-content">
                      <div class="saves-item-action-group">
                        <button
                          class="saves-sync-btn"
                          @click.stop="toggleItemExpansion(item)"
                        >
                          {{
                            isItemExpanded(item)
                              ? "收起"
                              : getItemChildrenCount(item) > 0
                                ? `展开 (${getItemChildrenCount(item)})`
                                : "展开"
                          }}
                        </button>
                        <button
                          class="saves-sync-btn"
                          :class="{
                            'is-syncing':
                              syncingItemId === item.id &&
                              syncingAction === 'upload',
                          }"
                          :disabled="
                            syncingItemId === item.id &&
                            syncingAction === 'upload'
                          "
                          title="上传到 Gist"
                          @click.stop="confirmUploadToGist(item)"
                        >
                          上传 Gist
                        </button>
                        <button
                          class="saves-sync-btn"
                          @click.stop="deleteSingleItem(item)"
                        >
                          删除
                        </button>
                        <button
                          class="saves-sync-btn"
                          @click.stop="editItemTags(item)"
                        >
                          + 标签
                        </button>
                      </div>
                      <div
                        class="saves-item-action-group saves-item-action-group-right"
                      >
                        <button
                          v-if="item.url"
                          class="saves-sync-btn"
                          @click.stop="copyUrl(item, 'raw')"
                        >
                          {{ item.blobUrl ? "Raw" : "Url" }}
                        </button>
                        <button
                          v-if="item.blobUrl"
                          class="saves-sync-btn"
                          @click.stop="copyUrl(item, 'blob')"
                        >
                          Blob
                        </button>
                        <button
                          v-if="item.gist?.rawUrl"
                          class="saves-sync-btn"
                          @click.stop="copyUrl(item, 'gist')"
                        >
                          Gist
                        </button>
                        <button
                          v-if="item.gist?.htmlUrl"
                          class="saves-sync-btn"
                          @click.stop="copyUrl(item, 'html')"
                        >
                          Html
                        </button>
                        <button
                          v-if="item.url"
                          class="saves-sync-btn"
                          :class="{
                            'is-syncing': refreshingUrlItemId === item.id,
                          }"
                          :disabled="refreshingUrlItemId === item.id"
                          title="从原始 URL 重新拉取"
                          @click.stop="confirmRefreshFromUrl(item)"
                        >
                          拉取 URL
                        </button>
                        <button
                          v-if="item.gist?.rawUrl"
                          class="saves-sync-btn"
                          :class="{
                            'is-syncing':
                              syncingItemId === item.id &&
                              syncingAction === 'gist',
                          }"
                          :disabled="
                            syncingItemId === item.id &&
                            syncingAction === 'gist'
                          "
                          title="从 Gist 拉取最新内容"
                          @click.stop="confirmDownloadFromGist(item)"
                        >
                          拉取 Gist
                        </button>
                        <button
                          class="saves-sync-btn"
                          @click.stop="renameItem(item)"
                        >
                          重命名
                        </button>
                        <!-- <button class="saves-sync-btn" :class="{ 'is-current': item.id === currentItemId }" :disabled="loadingItemId === item.id" @click.stop="loadItemForList(item)">
                  {{ item.id === currentItemId ? "当前" : "加载" }}
                </button> -->
                      </div>
                    </div>
                  </div>
                </Transition>
              </div>
            </Transition>
            <Transition name="saves-children">
              <div v-if="isItemExpanded(item)" class="saves-gist-children">
                <div class="saves-gist-children-content">
                  <div
                    @click.stop="toggleItemActions(child)"
                    v-for="child in gistChildItems(item)"
                    :key="child.id"
                    class="saves-item saves-gist-child"
                    :data-save-id="child.id"
                    :class="{
                      'saves-item-current': child.id === currentItemId,
                    }"
                  >
                    <input
                      v-if="selectMode"
                      type="checkbox"
                      :value="child.id"
                      v-model="checkedIds"
                      @click.stop
                    />

                    <div class="saves-item-info">
                      <span class="saves-item-name">
                        {{ child.name }}
                        <span
                          v-if="child.gist"
                          class="saves-item-source"
                          :title="gistPath(child)"
                          >{{ gistPath(child) }}</span
                        >
                        <span
                          v-if="child.tags?.length || isItemSynced(child)"
                          class="saves-item-tags"
                        >
                          <span
                            v-for="tag in child.tags"
                            :key="tag"
                            class="saves-item-tag"
                            :class="`saves-item-tag-${tag.toLowerCase()}`"
                            >{{ tag }}</span
                          >
                          <span
                            v-if="isItemSynced(child)"
                            class="saves-item-tag saves-item-tag-cf"
                            title="已同步至云端"
                          >
                            <img :src="cfsLogo" class="saves-item-cf-icon" alt="Cloud" />
                          </span>
                        </span>
                      </span>
                      <div class="saves-item-preview">
                        <span class="saves-item-content-preview">{{
                          child.preview || ""
                        }}</span>
                      </div>
                      <span class="saves-item-meta">
                        {{ formatTime(itemUpdatedAt(child)) }}
                        ·
                        {{ formatBytes(child.length) }}
                      </span>
                    </div>

                    <div
                      v-if="isItemActionsExpanded(child)"
                      class="saves-item-sync-actions"
                    >
                      <div class="saves-item-sync-actions-content">
                        <div class="saves-item-action-group">
                          <button
                            class="saves-sync-btn"
                            @click.stop="toggleItemExpansion(child)"
                          >
                            {{
                              isItemExpanded(child)
                                ? "收起"
                                : getItemChildrenCount(child) > 0
                                  ? `展开 (${getItemChildrenCount(child)})`
                                  : "展开"
                            }}
                          </button>
                          <button
                            class="saves-sync-btn"
                            :class="{
                              'is-syncing':
                                syncingItemId === child.id &&
                                syncingAction === 'upload',
                            }"
                            :disabled="
                              syncingItemId === child.id &&
                              syncingAction === 'upload'
                            "
                            title="上传到 Gist"
                            @click.stop="confirmUploadToGist(child)"
                          >
                            上传
                          </button>
                          <button
                            class="saves-sync-btn"
                            @click.stop="deleteSingleItem(child)"
                          >
                            删除
                          </button>
                          <button
                            class="saves-sync-btn"
                            @click.stop="editItemTags(child)"
                          >
                            + 标签
                          </button>
                        </div>
                        <div
                          class="saves-item-action-group saves-item-action-group-right"
                        >
                          <button
                            v-if="child.url"
                            class="saves-sync-btn"
                            @click.stop="copyUrl(child, 'raw')"
                          >
                            {{ child.blobUrl ? "Raw" : "Url" }}
                          </button>
                          <button
                            v-if="child.blobUrl"
                            title="复制 Blob URL"
                            class="saves-sync-btn"
                            @click.stop="copyUrl(child, 'blob')"
                          >
                            Blob
                          </button>
                          <button
                            v-if="child.gist?.rawUrl"
                            class="saves-sync-btn"
                            title="复制 Gist URL"
                            @click.stop="copyUrl(child, 'gist')"
                          >
                            Gist
                          </button>
                          <button
                            v-if="child.gist?.htmlUrl"
                            class="saves-sync-btn"
                            title="复制 Html URL"
                            @click.stop="copyUrl(child, 'html')"
                          >
                            Html
                          </button>
                          <button
                            v-if="child.url"
                            class="saves-sync-btn"
                            :class="{
                              'is-syncing': refreshingUrlItemId === child.id,
                            }"
                            :disabled="refreshingUrlItemId === child.id"
                            title="从原始 URL 重新拉取"
                            @click.stop="confirmRefreshFromUrl(child)"
                          >
                            从 URL 拉取
                          </button>
                          <button
                            v-if="child.gist?.rawUrl"
                            class="saves-sync-btn"
                            :class="{
                              'is-syncing':
                                syncingItemId === child.id &&
                                syncingAction === 'gist',
                            }"
                            :disabled="
                              syncingItemId === child.id &&
                              syncingAction === 'gist'
                            "
                            title="从 Gist 拉取最新内容"
                            @click.stop="confirmDownloadFromGist(child)"
                          >
                            从 Gist 拉取
                          </button>
                          <button
                            class="saves-sync-btn"
                            @click.stop="renameItem(child)"
                          >
                            重命名
                          </button>
                          <button
                            class="saves-sync-btn"
                            :class="{
                              'is-current': child.id === currentItemId,
                            }"
                            :disabled="loadingItemId === child.id"
                            @click.stop="loadItemForList(child)"
                          >
                            加载
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    class="saves-gist-child saves-gist-child-new"
                    @click.stop="createExpandedFile(item)"
                  >
                    {{ item.gist?.id ? "+ 新建 Gist 文件" : "+ 新建" }}
                  </button>
                </div>
              </div>
            </Transition>
          </template>
          <div class="saves-footers">
            <button
              class="saves-sync-btn saves-trash-btn"
              @click.stop="openTrashModal"
              title="管理被墓碑标记的已删除文件（保留60天内可恢复）"
            >
              回收站{{ trashList.length ? ` (${trashList.length})` : "" }}
            </button>
            <button class="saves-sync-btn" @click.stop="push_home">
              返回首页
            </button>
            <button
              class="saves-sync-btn"
              :disabled="backupInProgress"
              @click.stop="backupDatabase"
            >
              {{ backupInProgress ? "备份中…" : "备份" }}
            </button>
            <button
              class="saves-sync-btn"
              :disabled="restoreInProgress"
              @click.stop="triggerBackupRestore"
            >
              {{ restoreInProgress ? "恢复中…" : "恢复备份" }}
            </button>
          </div>
        </div>
      </div>
      <!-- 拖拽调整高度手柄 -->
      <div
        ref="savesHandleRef"
        class="saves-resize-handle"
        @pointerdown="startSavesResizePointer"
      >
        <div class="saves-resize-bar"></div>
      </div>
      <!-- 拖拽调整宽度手柄（宽屏时显示） -->
      <div
        class="saves-vresize-handle"
        @pointerdown="startSavesWidthResizePointer"
        title="拖拽调整宽度"
      >
        <div class="saves-vresize-bar"></div>
        <!-- <div class="saves-vresize-knob">
        <span class="saves-vresize-dots"></span>
      </div> -->
      </div>
    </div>
    <cmView
      v-if="editorReady"
      ref="cmViewRef"
      id="main"
      :isReadOnly="false"
      :class="{ 'saves-open': showSaves }"
    />
    <div style="height: 30dvh"></div>
  </div>
  <!-- ★ 可拖拽控制台面板 -->
  <div
    v-if="showlog"
    class="log-panel"
    ref="logPanelRef"
    :style="{
      left: logPos.x + 'px',
      top: logPos.y + 'px',
      width: logSize.w + 'px',
      height: logSize.h + 'px',
      maxWidth: '100vw',
      maxHeight: MAX_H + 'px',
    }"
  >
    <div class="log-header" @pointerdown.prevent="startDrag">
      <span class="log-title">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          version="1.1"
          viewBox="0 0 450 130"
          width="60"
          height="17"
          @click.stop="onClickLogo"
        >
          <ellipse
            cx="65"
            cy="65"
            rx="50"
            ry="52"
            stroke="rgb(220,60,54)"
            stroke-width="2"
            fill="rgb(237,108,96)"
          />
          <ellipse
            cx="225"
            cy="65"
            rx="50"
            ry="52"
            stroke="rgb(218,151,33)"
            stroke-width="2"
            fill="rgb(247,193,81)"
          />
          <ellipse
            cx="385"
            cy="65"
            rx="50"
            ry="52"
            stroke="rgb(27,161,37)"
            stroke-width="2"
            fill="rgb(100,200,86)"
          />
        </svg>
      </span>
      <span class="log-time">{{ logTime }}</span>
      <div class="log-actions">
        <button
          class="log-btn log-copy"
          @click.stop="copyText(logAllReactive)"
          title="复制日志"
        >
          <svg viewBox="0 1 26 17" width="14" height="14" fill="currentColor">
            <rect
              x="9"
              y="3"
              width="12"
              height="15"
              rx="1.5"
              stroke="currentColor"
              stroke-width="1.5"
              fill="none"
            ></rect>
            <path
              d="M15 21H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2"
              stroke="currentColor"
              stroke-width="1.5"
              fill="none"
            ></path>
          </svg>
        </button>
        <button
          class="log-btn log-run"
          @click.stop="goFunction()"
          title="运行脚本"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <polygon points="5,3 19,12 5,21" />
          </svg>
        </button>
      </div>
    </div>
    <div class="log-body" ref="logBodyRef">
      <pre class="log-pre">{{ logAllReactive }}</pre>
    </div>
    <div class="log-resize-handle" @pointerdown.prevent="startResize">↘</div>
  </div>

  <!-- 自定义输入弹窗 -->
  <div
    v-if="promptState.visible"
    class="modal-mask prompt-mask"
    :class="{ 'has-position': Boolean(promptState.position) }"
    @click.self="promptCancel"
    @touchmove="handleModalMaskTouchMove"
  >
    <div
      ref="promptDialogRef"
      class="modal-box prompt-box"
      :style="promptBoxStyle"
    >
      <div class="modal-title">{{ promptState.title }}</div>
      <div v-if="promptState.hasTags" class="modal-tag-list">
        <span v-for="tag in promptState.tags" :key="tag" class="modal-tag">
          {{ tag }}
          <button
            class="modal-tag-remove"
            :title="`删除标签 ${tag}`"
            @click="removePromptTag(tag)"
          >
            ×
          </button>
        </span>
      </div>
      <input
        ref="promptInputRef"
        v-model="promptState.value"
        class="modal-input"
        type="text"
        :placeholder="
          promptState.hasTags ? '输入标签后按回车添加' : '输入 URL 链接'
        "
        autofocus
        @input="autoFillScriptHubUserAgent"
        @keyup.enter="promptState.hasTags ? addPromptTag() : promptConfirm()"
        @keyup.esc="promptCancel"
      />
      <input
        v-if="promptState.hasUserAgent"
        v-model="promptState.userAgent"
        class="modal-input"
        type="text"
        placeholder="UA（可选）"
        @keyup.enter="promptConfirm"
        @keyup.esc="promptCancel"
      />
      <div class="modal-actions">
        <button class="modal-btn" @click="pasteToPromptInput">粘贴</button>
        <button class="modal-btn" @click="promptCancel">取消</button>
        <button class="modal-btn modal-btn-primary" @click="promptConfirm">
          确定
        </button>
      </div>
    </div>
  </div>

  <!-- 自定义确认弹窗 -->
  <div
    v-if="confirmState.visible"
    class="modal-mask confirm-mask"
    :class="{ 'has-position': Boolean(confirmState.position) }"
    @click.self="confirmNo"
  >
    <div
      ref="confirmDialogRef"
      class="modal-box confirm-box"
      :style="confirmBoxStyle"
      tabindex="-1"
      @keydown.enter.prevent="confirmYes"
      @keydown.esc.prevent="confirmNo"
    >
      <div class="modal-title">{{ confirmState.title }}</div>
      <label
        v-if="confirmState.hasInput"
        class="modal-input-label"
        for="gist-description-input"
        >Desc</label
      >
      <input
        v-if="confirmState.hasInput"
        id="gist-description-input"
        ref="confirmInputRef"
        v-model="confirmState.value"
        class="modal-input"
        type="text"
        autocomplete="off"
        @keyup.enter.prevent="confirmYes"
        @keyup.esc.prevent="confirmNo"
      />
      <div class="modal-actions">
        <button class="modal-btn" @click="confirmNo">取消</button>
        <button class="modal-btn modal-btn-primary" @click="confirmYes">
          确定
        </button>
      </div>
    </div>
  </div>

  <!-- 已删除文件管理（回收站）弹窗 -->
  <div
    v-if="trashModalVisible"
    style="z-index:2000;"
    class="modal-mask trash-mask"
    @click.self="closeTrashModal"
  >
    <div class="modal-box trash-box">
      <div class="trash-header">
        <div class="trash-title">
          <span>已删除文件管理</span>
          <span v-if="trashList.length" class="trash-badge">{{ trashList.length }}</span>
        </div>
        <button
          class="trash-close-btn"
          :disabled="Boolean(trashAction.activeId)"
          @click="closeTrashModal"
          title="关闭"
        >
          ×
        </button>
      </div>
      <div class="trash-tip">
        提示：已删除文件在本地与云端暂存保留 60 天。彻底删除将同时永久抹除云端与本地记录。
      </div>

      <!-- 全局批量操作进度条 -->
      <div v-if="trashAction.activeId === 'all'" class="trash-global-bar">
        <span class="trash-inline-spinner"></span>
        <span class="trash-global-bar-text">{{ trashAction.stepText }}</span>
      </div>

      <div class="trash-list-scroll">
        <div v-if="!trashList.length" class="trash-empty">
          <div class="trash-empty-icon">🗑️</div>
          <div class="trash-empty-text">回收站空空如也，暂无已删除文件</div>
        </div>
        <div
          v-for="item in trashList"
          :key="item.id"
          class="trash-item-row"
          :class="{
            'is-busy': trashAction.activeId === item.id || trashAction.activeId === 'all'
          }"
        >
          <div class="trash-item-info">
            <div class="trash-item-name-line">
              <span class="trash-item-name" :title="item.name">{{ item.name }}</span>
              <!-- 云端备份 Tag -->
              <span
                v-if="item.inCloud"
                class="trash-tag cloud"
                title="云端已备份，彻底删除时将同步抹除云端记录"
              >
                <img :src="cfsLogo" class="trash-tag-icon" alt="Cloud" />
                
              </span>
              <span v-if="item.isGist" class="trash-tag gist">Gist</span>
              <span v-else-if="item.language" class="trash-tag lang">{{ item.language }}</span>
            </div>
            <div class="trash-item-meta-line">
              <span class="trash-time">{{ formatTrashDate(item.deletedAt) }} 删除</span>
              <span class="trash-countdown" :class="{ 'near-expired': item.remainingDays <= 7 }">
                余 {{ item.remainingDays }} 天
              </span>
            </div>
            <!-- 行内操作进度提示条 -->
            <div
              v-if="trashAction.activeId === item.id"
              class="trash-row-progress"
              :class="trashAction.type"
            >
              <span class="trash-inline-spinner"></span>
              <span class="trash-progress-text">{{ trashAction.stepText }}</span>
            </div>
          </div>
          <div class="trash-item-actions">
            <button
              class="trash-btn trash-btn-restore"
              :disabled="Boolean(trashAction.activeId)"
              @click.stop="handleRestoreTrashItem(item)"
              title="恢复文件"
            >
              <span
                v-if="trashAction.activeId === item.id && trashAction.type === 'restore'"
                class="trash-inline-spinner"
              ></span>
              {{ trashAction.activeId === item.id && trashAction.type === "restore" ? "恢复中…" : "恢复" }}
            </button>
            <button
              class="trash-btn trash-btn-delete"
              :disabled="Boolean(trashAction.activeId)"
              @click.stop="handlePermanentDeleteTrashItem(item)"
              title="彻底删除（先清除云端再删除本地）"
            >
              <span
                v-if="trashAction.activeId === item.id && trashAction.type === 'delete'"
                class="trash-inline-spinner"
              ></span>
              {{ trashAction.activeId === item.id && trashAction.type === "delete" ? "删除中…" : "彻底删除" }}
            </button>
          </div>
        </div>
      </div>

      <div class="modal-actions trash-footer-actions">
        <button
          v-if="trashList.length"
          class="modal-btn modal-btn-primary trash-btn-batch-restore"
          :disabled="Boolean(trashAction.activeId)"
          @click="handleRestoreAllTrash"
        >
          <span
            v-if="trashAction.activeId === 'all' && trashAction.type === 'restore'"
            class="trash-inline-spinner"
          ></span>
          {{ trashAction.activeId === "all" && trashAction.type === "restore" ? trashAction.stepText : "全部恢复" }}
        </button>
        <button
          v-if="trashList.length"
          class="modal-btn modal-btn-danger trash-btn-batch-clear"
          :disabled="Boolean(trashAction.activeId)"
          @click="handleClearAllTrash"
        >
          <span
            v-if="trashAction.activeId === 'all' && trashAction.type === 'delete'"
            class="trash-inline-spinner"
          ></span>
          {{ trashAction.activeId === "all" && trashAction.type === "delete" ? trashAction.stepText : "全部清空" }}
        </button>
        <button
          class="modal-btn"
          :disabled="Boolean(trashAction.activeId)"
          @click="closeTrashModal"
        >
          关闭
        </button>
      </div>
    </div>
  </div>

  <!-- 同步确认与进度展示弹窗 -->
  <div
    v-if="syncModalState.visible"
    class="modal-mask sync-mask"
    @click.self="closeSyncModal"
  >
    <div class="modal-box sync-box" @click.stop>
      <div class="sync-header">
        <div class="sync-title-line">
          <span class="sync-title">{{ syncModalState.title }}</span>
          <span v-if="syncModalState.phase !== 'checking' && syncModalState.phase !== 'empty'" class="sync-count-tag">
            {{ syncModalState.activeItems.length }} 项
          </span>
        </div>
        <button
          v-if="syncModalState.phase !== 'syncing'"
          class="sync-close-btn"
          @click="closeSyncModal"
          title="关闭"
        >
          ✕
        </button>
      </div>

      <!-- 上传 / 下载 Tab 切换导航 -->
      <div class="sync-tab-nav">
        <button
          class="sync-tab-btn"
          :class="{ active: syncModalState.tab === 'upload' }"
          :disabled="syncModalState.phase === 'syncing'"
          @click="switchSyncTab('upload')"
        >
          <span>上传到云端</span>
          <span
            v-if="syncModalState.uploadItems.length > 0"
            class="sync-tab-badge"
          >
            {{ syncModalState.uploadItems.length }}
          </span>
        </button>
        <button
          class="sync-tab-btn"
          :class="{ active: syncModalState.tab === 'download' }"
          :disabled="syncModalState.phase === 'syncing'"
          @click="switchSyncTab('download')"
        >
          <span>从云端下载</span>
          <span
            v-if="syncModalState.downloadItems.length > 0"
            class="sync-tab-badge"
          >
            {{ syncModalState.downloadItems.length }}
          </span>
        </button>
      </div>

      <div class="sync-body">
        <!-- 检查中骨架/懒加载 -->
        <div v-if="syncModalState.phase === 'checking'" class="sync-loading-box">
          <span class="sync-spinner large"></span>
          <span class="sync-loading-text">正在检查云端与本地差异…</span>
        </div>

        <!-- 无变动空状态 -->
        <div v-else-if="syncModalState.phase === 'empty'" class="sync-empty-box">
          <div class="sync-empty-icon">✓</div>
          <div class="sync-empty-text">
            {{ syncModalState.tab === 'upload' ? '云端已是最新，无变更需上传' : '本地已是最新，无文件需下载' }}
          </div>
        </div>

        <!-- 有变动/同步中/已完成 -->
        <template v-else>
          <div class="sync-tip">
            <span v-if="syncModalState.phase === 'confirm'">
              请确认以下需要{{ syncModalState.tab === 'upload' ? '上传同步到云端' : '从云端下载到本地' }}的项目：
            </span>
            <span v-else-if="syncModalState.phase === 'syncing'">
              正在同步中，请勿关闭页面…
            </span>
            <span v-else-if="syncModalState.error" style="color: #dc3545;">
              ✗ {{ syncModalState.error }}
            </span>
            <span v-else class="sync-tip-success">
              ✓ {{ syncModalState.summary || '同步已完成' }}
            </span>
          </div>

          <div class="sync-item-list">
            <div
              v-for="item in syncModalState.activeItems"
              :key="item.id"
              class="sync-item-row"
              :class="`status-${item.status}`"
            >
              <div class="sync-item-info">
                <div class="sync-item-top">
                  <span class="sync-item-name" :title="item.name">{{ item.name }}</span>
                  <span class="sync-item-type-badge" :class="item.type">{{ item.type }}</span>
                </div>
                <div class="sync-item-reason" :title="item.reason">{{ item.reason }}</div>
              </div>
              <div class="sync-item-status">
                <span v-if="item.status === 'pending'" class="status-badge pending">
                  {{ syncModalState.tab === 'upload' ? '待上传' : '待下载' }}
                </span>
                <span v-else-if="item.status === 'uploading'" class="status-badge progress">
                  <span class="sync-spinner"></span> 上传中...
                </span>
                <span v-else-if="item.status === 'downloading'" class="status-badge progress">
                  <span class="sync-spinner"></span> 下载中...
                </span>
                <span v-else-if="item.status === 'success'" class="status-badge success">
                  ✓ 成功
                </span>
                <span v-else-if="item.status === 'error'" class="status-badge error" :title="item.error">
                  ✗ 失败
                </span>
              </div>
            </div>
          </div>
        </template>
      </div>

      <div class="sync-footer">
        <template v-if="syncModalState.phase === 'checking'">
          <button class="sync-btn cancel" @click="closeSyncModal">取消</button>
          <button class="sync-btn confirm disabled" disabled>
            <span class="sync-spinner white"></span> 正在比对差异…
          </button>
        </template>
        <template v-else-if="syncModalState.phase === 'empty'">
          <button class="sync-btn cancel" @click="closeSyncModal">关闭</button>
          <button
            class="sync-btn confirm"
            @click="openSyncModal(syncModalState.tab)"
          >
            重新检查
          </button>
        </template>
        <template v-else-if="syncModalState.phase === 'confirm'">
          <button class="sync-btn cancel" @click="closeSyncModal">取消</button>
          <button class="sync-btn confirm" @click="executeSyncModal">
            确认{{ syncModalState.tab === 'upload' ? '上传' : '下载' }}
          </button>
        </template>
        <template v-else-if="syncModalState.phase === 'syncing'">
          <button class="sync-btn confirm" disabled>
            <span class="sync-spinner white"></span> 同步中...
          </button>
        </template>
        <template v-else>
          <button class="sync-btn confirm" @click="closeSyncModal">完成</button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import cmView from "./cmView.vue";
import {
  ref,
  computed,
  nextTick,
  watch,
  watchEffect,
  onMounted,
  onBeforeUnmount,
  toRaw,
} from "vue";
import { showToast } from "vant";
import { useTheme } from "@/hooks/theme";
import { useCmStore } from "@/store/cmCodeStore.js";
import useV3Clipboard from "vue-clipboard3";
import { useRoute, useRouter } from "vue-router";
import { sendReq } from "@/http/http.js";
import { toStableGistRawUrl } from "@/gist/rawUrl.js";
import {
  codehubStorage as idbStorage,
  computeGistHash,
  contentKey,
  getGistItemId,
  getIdsFromSavesIndex,
  getLogicalFileId,
  markCodeHubItemsDeleted,
  metaKey,
  moveCodeHubItemId,
  parseSavesIndex,
  prependGistFileToCache,
  removeGistFilesFromCache,
  removeGistFilesFromCodeHub,
  renameGistFileInCodeHub,
  GIST_LIST_KEY,
  SAVES_INDEX_KEY,
  syncGistFilesToCodeHub,
  getDeletedTombstoneList,
  restoreCodeHubTombstoneItem,
  restoreAllCodeHubTombstones,
  permanentlyDeleteCodeHubTombstone,
} from "@/storage/codehubStorage.js";
import {
  getCodeHubSyncConfig,
  checkCodeHubSyncDiff,
  restoreCodeHubSnapshot,
  uploadCodeHubSnapshot,
  restoreFileFromCloud,
  apiDeleteFileFromCloud,
  apiDeleteMultipleFilesFromCloud,
  fetchCloudTrashInfo,
  isCodeHubSyncAutoCheckEnabled,
} from "@/storage/codehubSync.js";

import JSZip from "jszip";
import "./env.js";
import cfsLogo from "@/img/svg/cfs.svg";
const isItemSynced = (item) => Boolean(item?.cf_meta || item?.cf_content);
let skipWatchSave = false;
let isSwitchingItem = false; // 切换文件期间抑制自动保存 watch
const route = useRoute();
const router = useRouter();
const israw = ref(false);
const grc = ref("");
const { toClipboard } = useV3Clipboard();
const cmStore = useCmStore();
const syncingCodeHub = ref(false);
const syncDiffInfo = ref(null); // 云端与本地差异信息

const checkRemoteSync = async (silent = false) => {
  try {
    const diff = await checkCodeHubSyncDiff();
    if (diff && diff.hasChanges) {
      syncDiffInfo.value = diff;
      if (!silent) {
        if (diff.remoteNewCount > 0 && diff.localNewCount > 0) {
          showToast({
            message: `云端有 ${diff.remoteNewCount} 个更新，本地有 ${diff.localNewCount} 个待上传，点击“同步”查看`,
            duration: 3500,
          });
        } else if (diff.remoteNewCount > 0) {
          const names = diff.downloadItems?.map((it) => it.name || it.id).slice(0, 3).join(", ");
          showToast({
            message: `云端检测到 ${diff.remoteNewCount} 个更新${names ? `（${names}${diff.downloadItems.length > 3 ? " 等" : ""}）` : ""}，点击“同步”可下载`,
            duration: 3500,
          });
        } else if (diff.localNewCount > 0) {
          if (diff.uploadItems && diff.uploadItems.length > 0) {
            const names = diff.uploadItems.map((it) => it.name || it.id).slice(0, 3).join(", ");
            showToast({
              message: `本地有 ${diff.localNewCount} 个待同步更新（${names}${diff.uploadItems.length > 3 ? " 等" : ""}），点击“同步”可上传`,
              duration: 3500,
            });
          } else if (diff.trashPendingUploadItems && diff.trashPendingUploadItems.length > 0) {
            const trashNames = diff.trashPendingUploadItems.map((it) => it.name || it.id).slice(0, 3).join(", ");
            showToast({
              message: `本地有 ${diff.trashPendingUploadItems.length} 个回收站暂存待备份（${trashNames}），点击“同步”可上传`,
              duration: 3500,
            });
          } else {
            showToast({
              message: `本地有 ${diff.localNewCount} 个待同步更新，点击“同步”可上传`,
              duration: 3000,
            });
          }
        }
      }
    } else {
      syncDiffInfo.value = null;
    }
  } catch (e) {
    // 检查失败仅记录，不打扰用户
    console.debug("检查云端差异失败:", e);
  }
};

// ============================================
// 回收站（已删除文件管理 / 60天墓碑机制）
// ============================================
const trashModalVisible = ref(false);
const trashList = ref([]);
const isRestoringTrash = ref(false);

// 回收站当前正在执行的操作状态
const trashAction = ref({
  activeId: null, // null | 'all' | 具体 item.id
  type: "", // 'restore' | 'delete'
  stepText: "",
});

const loadTrashList = async () => {
  try {
    const list = await getDeletedTombstoneList();
    trashList.value = list;

    // 异步查询云端真实索引，给在云端有记录的文件精准打上 inCloud = true
    fetchCloudTrashInfo()
      .then((cloudInfo) => {
        if (!cloudInfo || !trashList.value?.length) return;
        const { keys = {}, tombstones = {} } = cloudInfo;
        trashList.value = trashList.value.map((item) => {
          const inCloud = Boolean(
            item.inCloud ||
              keys[metaKey(item.id)] ||
              keys[contentKey(item.id)] ||
              tombstones[item.id]
          );
          return { ...item, inCloud };
        });
      })
      .catch(() => {});
  } catch (err) {
    console.debug("获取回收站列表失败:", err);
  }
};

const openTrashModal = async () => {
  await loadTrashList();
  trashModalVisible.value = true;
};

const closeTrashModal = () => {
  if (trashAction.value.activeId) return;
  trashModalVisible.value = false;
};

const formatTrashDate = (timestamp) => {
  if (!timestamp) return "-";
  const d = new Date(timestamp);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const handleRestoreTrashItem = async (item) => {
  if (!item?.id || trashAction.value.activeId) return;

  const confirmed = await askConfirm(`确定要恢复文件 "${item.name || item.id}" 吗？`);
  if (!confirmed) return;

  trashAction.value = {
    activeId: item.id,
    type: "restore",
    stepText: "正在恢复...",
  };

  try {
    let ok = await restoreCodeHubTombstoneItem(item.id);
    if (!ok) {
      // 本地暂存若不存在（如在其他端），尝试从云端拉取恢复
      trashAction.value.stepText = "正在从云端拉取备份...";
      const cloudData = await restoreFileFromCloud(item.id);
      if (cloudData) {
        cloudData.isCloud = true;
        ok = await restoreCodeHubTombstoneItem(item.id, cloudData);
      }
    }
    if (ok) {
      showToast(`已成功恢复: ${item.name || item.id}`);
      await loadTrashList();
      await loadSaves();
    } else {
      showToast(`恢复失败: 未找到可用的文件内容备份`, 3000);
    }
  } catch (err) {
    showToast(`恢复出错: ${err?.message || err}`);
  } finally {
    trashAction.value = { activeId: null, type: "", stepText: "" };
  }
};

const handleRestoreAllTrash = async () => {
  const total = trashList.value.length;
  if (!total || trashAction.value.activeId) return;

  const confirmed = await askConfirm(`确定要恢复回收站中的全部 ${total} 个文件吗？`);
  if (!confirmed) return;

  trashAction.value = {
    activeId: "all",
    type: "restore",
    stepText: `正在恢复 (0/${total})...`,
  };

  try {
    let count = 0;
    for (let i = 0; i < trashList.value.length; i++) {
      const item = trashList.value[i];
      trashAction.value.stepText = `正在恢复 (${i + 1}/${total}): ${item.name || item.id}`;
      let ok = await restoreCodeHubTombstoneItem(item.id);
      if (!ok) {
        const cloudData = await restoreFileFromCloud(item.id);
        if (cloudData) {
          cloudData.isCloud = true;
          ok = await restoreCodeHubTombstoneItem(item.id, cloudData);
        }
      }
      if (ok) count++;
    }
    showToast(`成功恢复全部 ${count} 个文件`);
    await loadTrashList();
    await loadSaves();
    if (!trashList.value.length) {
      closeTrashModal();
    }
  } catch (err) {
    showToast(`批量恢复出错: ${err?.message || err}`);
  } finally {
    trashAction.value = { activeId: null, type: "", stepText: "" };
  }
};

const handlePermanentDeleteTrashItem = async (item) => {
  if (!item?.id || trashAction.value.activeId) return;

  const confirmed = await askConfirm(
    `确定彻底删除 "${item.name || item.id}" 吗？\n该操作不可撤销，将永久删除${item.inCloud ? "云端与本地" : "本地"}记录与备份。`
  );
  if (!confirmed) return;

  trashAction.value = {
    activeId: item.id,
    type: "delete",
    stepText: "准备删除...",
  };

  const { url, token } = getCodeHubSyncConfig();
  const hasCloudConfig = Boolean(url && token);

  try {
    // 1. 若配置了云端，提示并先从云端彻底删除文件与索引
    if (hasCloudConfig) {
      trashAction.value.stepText = "正在从云端彻底删除文件与元数据...";
      try {
        await apiDeleteFileFromCloud(item.id, {
          onProgress: (p) => {
            if (p.step === "updating_index") {
              trashAction.value.stepText = "正在更新云端根索引并清除记录...";
            } else if (p.step === "done") {
              trashAction.value.stepText = "云端已彻底删除完毕";
            }
          },
        });
        trashAction.value.stepText = "云端删除完毕，正在清理本地数据...";
      } catch (cloudErr) {
        showToast(`云端删除失败: ${cloudErr?.message || cloudErr}，已终止操作以保护数据`, 4000);
        trashAction.value = { activeId: null, type: "", stepText: "" };
        return; // 云端未彻底删除前，不删除本地数据
      }
    } else {
      trashAction.value.stepText = "正在清理本地回收站暂存与墓碑...";
    }

    // 2. 云端彻底删除完毕后，才删除本地
    await permanentlyDeleteCodeHubTombstone(item.id);
    trashAction.value.stepText = "删除成功";

    showToast(
      hasCloudConfig
        ? `"${item.name || item.id}" 已彻底删除（云端与本地已同步清理）`
        : `"${item.name || item.id}" 本地已彻底删除`
    );
    await loadTrashList();
    await loadSaves();
  } catch (err) {
    showToast(`删除失败: ${err?.message || err}`);
  } finally {
    trashAction.value = { activeId: null, type: "", stepText: "" };
  }
};

const handleClearAllTrash = async () => {
  const total = trashList.value.length;
  if (!total || trashAction.value.activeId) return;

  const hasCloudItem = trashList.value.some((it) => it.inCloud);
  const confirmed = await askConfirm(
    `确定要彻底清空回收站中的全部 ${total} 个文件吗？\n将永久抹除所有文件${hasCloudItem ? "及其云端备份" : ""}，此操作不可撤销！`
  );
  if (!confirmed) return;

  trashAction.value = {
    activeId: "all",
    type: "delete",
    stepText: "正在准备清空...",
  };

  const { url, token } = getCodeHubSyncConfig();
  const hasCloudConfig = Boolean(url && token);
  const ids = trashList.value.map((it) => it.id);

  try {
    if (hasCloudConfig) {
      trashAction.value.stepText = `正在从云端彻底删除 ${ids.length} 个文件...`;
      try {
        await apiDeleteMultipleFilesFromCloud(ids, {
          onProgress: (p) => {
            if (p.step === "deleting_files") {
              trashAction.value.stepText = `正在删除云端文件 (${p.current}/${p.total})...`;
            } else if (p.step === "updating_index") {
              trashAction.value.stepText = "正在清理云端根索引记录...";
            } else if (p.step === "done") {
              trashAction.value.stepText = "云端批量删除完成，正在清空本地...";
            }
          },
        });
      } catch (cloudErr) {
        showToast(`云端清空失败: ${cloudErr?.message || cloudErr}，已终止操作`, 4000);
        trashAction.value = { activeId: null, type: "", stepText: "" };
        return;
      }
    } else {
      trashAction.value.stepText = "正在清空本地回收站...";
    }

    // 云端删除完毕后，清空本地
    for (const id of ids) {
      await permanentlyDeleteCodeHubTombstone(id);
    }

    showToast(
      hasCloudConfig
        ? `已彻底清空回收站（云端与本地已同步抹除）`
        : `本地回收站已彻底清空`
    );
    await loadTrashList();
    await loadSaves();
    closeTrashModal();
  } catch (err) {
    showToast(`清空回收站失败: ${err?.message || err}`);
  } finally {
    trashAction.value = { activeId: null, type: "", stepText: "" };
  }
};

// 同步确认与进度弹窗状态
const syncModalState = ref({
  visible: false,
  tab: "upload", // 'upload' | 'download'
  phase: "confirm", // 'checking' | 'confirm' | 'empty' | 'syncing' | 'done'
  title: "CodeHub 云端同步",
  diff: null,
  uploadItems: [],
  downloadItems: [],
  activeItems: [],
  summary: "",
  error: null,
});

const closeSyncModal = () => {
  if (syncModalState.value.phase === "syncing") return;
  syncModalState.value.visible = false;
};

// 切换弹窗内的标签页（上传 / 下载）
const switchSyncTab = (tab) => {
  if (syncModalState.value.phase === "syncing") return;
  syncModalState.value.tab = tab;
  updateSyncModalActiveItems();
};

const updateSyncModalActiveItems = () => {
  const isUpload = syncModalState.value.tab === "upload";
  const items = isUpload ? syncModalState.value.uploadItems : syncModalState.value.downloadItems;
  syncModalState.value.activeItems = items;
  if (syncModalState.value.phase !== "syncing") {
    syncModalState.value.phase = items.length === 0 ? "empty" : "confirm";
  }
};

// 打开统一云同步弹窗（优先比对差异并展示）
const openSyncModal = async (defaultTab) => {
  const { url, token } = getCodeHubSyncConfig();
  if (!url || !token) {
    showToast({
      message: "请先在【设置】中填写 Worker 接口地址和访问 Token",
      duration: 3500,
    });
    return;
  }
  console.log("======1")
  // 计算默认优先展示的标签页：优先展示有待处理项的一侧
  let initialTab = defaultTab;  console.log("======2")
  if (!initialTab) {
    if (syncDiffInfo.value) {
      if (syncDiffInfo.value.remoteNewCount > 0 && syncDiffInfo.value.localNewCount === 0) {
        initialTab = "download";
      } else {
        initialTab = "upload";
      }
    } else {
      initialTab = "upload";
    }
  }
console.log("======3")
  syncModalState.value = {
    visible: true,
    tab: initialTab,
    phase: "checking",
    title: "CodeHub 云端同步",
    diff: null,
    uploadItems: [],
    downloadItems: [],
    activeItems: [],
    summary: "",
    error: null,
  };

  syncingCodeHub.value = true;
  try { console.log("======4")
    // 添加超时保护，防止 checkCodeHubSyncDiff 内部 fetch 无限挂起
    const diff = await Promise.race([
      checkCodeHubSyncDiff(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("检查云端差异超时，请检查网络连接和 Worker 地址")), 20000)
      ),
    ]);
    if (!syncModalState.value.visible) return;
console.log("======5")
    if (!diff) {
      syncModalState.value.phase = "done";
      syncModalState.value.error = "检查云端数据失败，请检查网络与配置";
      return;
    }

    syncModalState.value.diff = diff;
    syncDiffInfo.value = diff.hasChanges ? diff : null;

    // 解析上传项
    const uploadItems = diff.uploadItems || [];
    const trashItems = diff.trashPendingUploadItems || [];
    const hasGist = Boolean(diff.gistListChanged);
    const hasTombstone = Boolean(diff.tombstoneChanged);
console.log("======6")
    const formattedUploadItems = [
      ...uploadItems.map((it) => ({
        id: it.id,
        name: it.name || it.id,
        type: it.reason?.includes("缺失") ? "新增" : "更新",
        reason: it.reason || "本地修改",
        status: "pending",
        error: null,
      })),
      ...trashItems.map((it) => ({
        id: it.id,
        name: it.name || it.id,
        type: "回收站",
        reason: "回收站暂存备份",
        status: "pending",
        error: null,
      })),
      ...(hasGist
        ? [
            {
              id: "__gist_list__",
              name: "Gist 收藏列表",
              type: "列表",
              reason: "本地 Gist 列表有变动",
              status: "pending",
              error: null,
            },
          ]
        : []),
      ...(hasTombstone && uploadItems.length === 0 && trashItems.length === 0 && !hasGist
        ? [
            {
              id: "__tombstones__",
              name: "删除标记记录",
              type: "状态",
              reason: "回收站墓碑状态同步",
              status: "pending",
              error: null,
            },
          ]
        : []),
    ];

    // 解析下载项
    const downloadItems = diff.downloadItems || [];
    const formattedDownloadItems = [
      ...downloadItems.map((it) => ({
        id: it.id,
        name: it.name || it.id,
        type: it.reason?.includes("缺失") ? "新增" : "更新",
        reason: it.reason || "云端更新",
        status: "pending",
        error: null,
      })),
      ...(hasGist
        ? [
            {
              id: "__gist_list__",
              name: "Gist 收藏列表",
              type: "列表",
              reason: "云端 Gist 列表有更新",
              status: "pending",
              error: null,
            },
          ]
        : []),
    ];

    syncModalState.value.uploadItems = formattedUploadItems;
    syncModalState.value.downloadItems = formattedDownloadItems;

    // 如果未明确指定标签，且上传为空但下载有项，自动切到下载
    if (!defaultTab && formattedUploadItems.length === 0 && formattedDownloadItems.length > 0) {
      syncModalState.value.tab = "download";
    }
  console.log("======7")
    updateSyncModalActiveItems();console.log("======8")
  } catch (error) {
    if (syncModalState.value.visible) {
      syncModalState.value.phase = "done";
      syncModalState.value.error = error.message || "检查云同步差异失败";
    }
  } finally {
    console.log("======9")
    syncingCodeHub.value = false;
  }
};

// 兼容旧调用的入口函数
// const syncCodeHub = async (action = "upload") => {
//   openSyncModal(action === "restore" ? "download" : action);
// };

const executeSyncModal = async () => {
  if (syncModalState.value.phase !== "confirm") return;
  const isUpload = syncModalState.value.tab === "upload";
  syncModalState.value.phase = "syncing";
  syncingCodeHub.value = true;
  syncModalState.value.error = null;

  const onProgress = ({ id, status, error }) => {
    const target = syncModalState.value.activeItems.find((it) => it.id === id);
    if (target) {
      target.status = status;
      if (error) target.error = error?.message || String(error);
    }
  };

  try {
    if (isUpload) {
      const res = await uploadCodeHubSnapshot({ onProgress });
      syncModalState.value.activeItems.forEach((it) => {
        if (it.status === "pending" || it.status === "uploading") {
          it.status = "success";
        }
      });
      await loadSaves();

      const parts = [];
      if (res.uploaded > 0) parts.push(`上传 ${res.uploaded} 个项目`);
      if (res.deleted > 0) parts.push(`删除 ${res.deleted} 个云端废弃文件`);
      if (res.failed > 0) parts.push(`${res.failed} 个文件项目失败`);
      if (res.failedDeleted > 0) parts.push(`${res.failedDeleted} 个云端文件删除失败`);
      if (parts.length === 0 && res.indexChanged) {
        parts.push("已同步索引与墓碑记录");
      }
      const summaryText = parts.length > 0 ? parts.join("，") : "上传同步完成";
      syncModalState.value.summary = summaryText;
      syncModalState.value.phase = "done";
      showToast(`同步完成：${summaryText}`);
      // 上传后重新比对一次差异（静默）
      await checkRemoteSync(true);
    } else {
      const res = await restoreCodeHubSnapshot({ onProgress });
      syncModalState.value.activeItems.forEach((it) => {
        if (it.status === "pending" || it.status === "downloading") {
          it.status = "success";
        }
      });
      await loadSaves();

      const summaryText =
        res.downloaded > 0
          ? `已同步下载 ${res.downloaded} 个文件`
          : "下载同步完成";
      syncModalState.value.summary = summaryText;
      syncModalState.value.phase = "done";
      showToast(summaryText);
      // 下载后重新比对一次差异（静默）
      await checkRemoteSync(true);
    }
  } catch (error) {
    syncModalState.value.phase = "done";
    syncModalState.value.error = error?.message || "云同步失败";
    showToast(error.message || "云同步失败");
  } finally {
    syncingCodeHub.value = false;
  }
};
const showlog = ref(false);
const EMPTY_CONTENT = "\n".repeat(19);
const { isDarkModeEnabled } = useTheme();
const logAllReactive = ref("");
const logTime = ref("");

// ===== 控制台面板位置/大小 =====
// const logPanelRef = ref(null);
const logBodyRef = ref(null);
const savedPos = localStorage.getItem("logPos");
const savedSize = localStorage.getItem("logSize");
const logPos = ref(savedPos ? JSON.parse(savedPos) : { x: 16, y: 80 });
const logSize = ref(
  savedSize
    ? JSON.parse(savedSize)
    : {
        w: Math.round(window.innerWidth * 0.99),
        h: Math.min(window.innerHeight * 0.35, 360),
      },
);
const MAX_H = Math.round(window.innerHeight * 0.6);

// 拖拽移动
let _dragData = null;
function startDrag(e) {
  _dragData = {
    sx: e.clientX,
    sy: e.clientY,
    ox: logPos.value.x,
    oy: logPos.value.y,
    moved: false,
  };
  document.addEventListener("pointermove", onDrag);
  document.addEventListener("pointerup", endDrag);
}
function onDrag(e) {
  if (!_dragData) return;
  _dragData.moved = true;
  logPos.value.x = _dragData.ox + (e.clientX - _dragData.sx);
  logPos.value.y = Math.max(0, _dragData.oy + (e.clientY - _dragData.sy));
}
function endDrag() {
  if (_dragData) {
    localStorage.setItem("logPos", JSON.stringify(logPos.value));
  }
  _dragData = null;
  document.removeEventListener("pointermove", onDrag);
  document.removeEventListener("pointerup", endDrag);
}

function cleanupDragListeners() {
  _dragData = null;
  document.removeEventListener("pointermove", onDrag);
  document.removeEventListener("pointerup", endDrag);
}
function onClickLogo() {
  if (_dragData?.moved) return; // 拖拽不关闭
  showlog.value = false;
}

// 拖拽缩放
let _resizeData = null;
function startResize(e) {
  _resizeData = {
    sx: e.clientX,
    sy: e.clientY,
    ow: logSize.value.w,
    oh: logSize.value.h,
  };
  document.addEventListener("pointermove", onResize);
  document.addEventListener("pointerup", endResize);
}
function onResize(e) {
  if (!_resizeData) return;
  logSize.value.w = Math.max(
    200,
    _resizeData.ow + (e.clientX - _resizeData.sx),
  );
  logSize.value.h = Math.min(
    MAX_H,
    Math.max(80, _resizeData.oh + (e.clientY - _resizeData.sy)),
  );
}
function endResize() {
  if (_resizeData) {
    localStorage.setItem("logSize", JSON.stringify(logSize.value));
  }
  _resizeData = null;
  document.removeEventListener("pointermove", onResize);
  document.removeEventListener("pointerup", endResize);
}

function cleanupResizeListeners() {
  _resizeData = null;
  document.removeEventListener("pointermove", onResize);
  document.removeEventListener("pointerup", endResize);
}
// ===== 控制台面板 end =====
const props = defineProps(["isReadOnly"]);
const lastSavedContent = ref("");
const promptInputRef = ref(null);
const promptDialogRef = ref(null);
const confirmDialogRef = ref(null);
const confirmInputRef = ref(null);

// ★ 修复：cmView 实例 ref，用于加载大文件前调用 skipNextLanguageSync
const cmViewRef = ref(null);

// ===== 自定义弹窗 =====
const promptState = ref({
  visible: false,
  title: "",
  value: "",
  userAgent: "",
  hasUserAgent: false,
  hasTags: false,
  tags: [],
  position: null,
  resolve: null,
});
const confirmState = ref({
  visible: false,
  title: "",
  value: "",
  hasInput: false,
  position: null,
  resolve: null,
});

const promptBoxStyle = computed(() => {
  if (!promptState.value.position) return {};
  const { x, y } = promptState.value.position;
  return {
    position: "fixed",
    left: `${x}px`,
    top: `${y}px`,
  };
});

const confirmBoxStyle = computed(() => {
  if (!confirmState.value.position) return {};
  const { x, y } = confirmState.value.position;
  return {
    position: "fixed",
    left: `${x}px`,
    top: `${y}px`,
  };
});

function getViewportSize() {
  const vv = window.visualViewport;
  const vw = Math.min(
    window.innerWidth || 0,
    document.documentElement.clientWidth || window.innerWidth || 0,
    vv ? vv.width : window.innerWidth
  );
  const vh = Math.min(
    window.innerHeight || 0,
    document.documentElement.clientHeight || window.innerHeight || 0,
    vv ? vv.height : window.innerHeight
  );
  return {
    vw: vw > 0 ? vw : window.innerWidth,
    vh: vh > 0 ? vh : window.innerHeight,
  };
}

// 监听弹窗显示/隐藏：自动获取焦点、DOM精确边界校正、锁定页面滚动、适配软键盘
let visualViewportCleanup = null;

function adjustPopupForKeyboard() {
  if (typeof window === "undefined") return;
  const vv = window.visualViewport;
  const currentVh = vv ? vv.height : window.innerHeight;
  const margin = 20;

  // 避免浏览器在输入法弹起时擅自滚动 window
  if (window.scrollY !== 0) {
    window.scrollTo(0, 0);
  }

  // 纠正 prompt 弹窗避免被键盘遮挡
  if (promptState.value.visible && promptDialogRef.value && promptState.value.position) {
    const rect = promptDialogRef.value.getBoundingClientRect();
    let currentY = promptState.value.position.y;
    if (currentY + rect.height > currentVh - margin) {
      const newY = Math.max(margin, Math.round(currentVh - rect.height - margin));
      if (newY !== currentY) {
        promptState.value.position = {
          ...promptState.value.position,
          y: newY,
        };
      }
    }
  }

  // 纠正 confirm 弹窗避免被键盘遮挡
  if (confirmState.value.visible && confirmDialogRef.value && confirmState.value.position) {
    const rect = confirmDialogRef.value.getBoundingClientRect();
    let currentY = confirmState.value.position.y;
    if (currentY + rect.height > currentVh - margin) {
      const newY = Math.max(margin, Math.round(currentVh - rect.height - margin));
      if (newY !== currentY) {
        confirmState.value.position = {
          ...confirmState.value.position,
          y: newY,
        };
      }
    }
  }
}

function syncModalScrollLock() {
  if (typeof document === "undefined") return;
  const isAnyModalOpen = promptState.value.visible || confirmState.value.visible;
  if (isAnyModalOpen) {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    if (!visualViewportCleanup && window.visualViewport) {
      const onResizeOrScroll = () => {
        adjustPopupForKeyboard();
      };
      window.visualViewport.addEventListener("resize", onResizeOrScroll);
      window.visualViewport.addEventListener("scroll", onResizeOrScroll);
      window.addEventListener("scroll", onResizeOrScroll);
      visualViewportCleanup = () => {
        window.visualViewport?.removeEventListener("resize", onResizeOrScroll);
        window.visualViewport?.removeEventListener("scroll", onResizeOrScroll);
        window.removeEventListener("scroll", onResizeOrScroll);
        visualViewportCleanup = null;
      };
    }
  } else {
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
    document.body.style.touchAction = "";
    if (visualViewportCleanup) {
      visualViewportCleanup();
    }
    if (typeof window !== "undefined" && window.scrollY !== 0) {
      window.scrollTo(0, 0);
    }
  }
}

watch(
  () => promptState.value.visible,
  (visible) => {
    syncModalScrollLock();
    if (visible) {
      nextTick(() => {
        // 使用 preventScroll 防止获焦时浏览器自动滚屏
        promptInputRef.value?.focus({ preventScroll: true });

        // 测量实际渲染宽高，修正位置避免超出屏幕（保留20px安全边距）
        if (promptDialogRef.value && promptState.value.position) {
          const rect = promptDialogRef.value.getBoundingClientRect();
          const margin = 20;
          const { vw, vh } = getViewportSize();

          let targetX = rect.left;
          let targetY = rect.top;

          // 窄屏幕时水平居中
          if (vw <= 480 || vw - margin * 2 <= rect.width) {
            targetX = Math.max(margin, Math.round((vw - rect.width) / 2));
          } else {
            if (targetX + rect.width > vw - margin) {
              targetX = vw - margin - rect.width;
            }
            if (targetX < margin) {
              targetX = margin;
            }
          }

          if (targetY + rect.height > vh - margin) {
            targetY = vh - margin - rect.height;
          }
          if (targetY < margin) {
            targetY = margin;
          }

          if (
            Math.round(targetX) !== Math.round(rect.left) ||
            Math.round(targetY) !== Math.round(rect.top)
          ) {
            promptState.value.position = {
              x: Math.round(targetX),
              y: Math.round(targetY),
            };
          }
        }
      });
    }
  },
);

watch(
  () => confirmState.value.visible,
  (visible) => {
    syncModalScrollLock();
    if (visible) {
      nextTick(() => {
        const target = confirmState.value.hasInput
          ? confirmInputRef.value
          : confirmDialogRef.value;
        target?.focus({ preventScroll: true });

        // 测量实际渲染宽高，修正位置避免超出屏幕（保留20px安全边距）
        if (confirmDialogRef.value && confirmState.value.position) {
          const rect = confirmDialogRef.value.getBoundingClientRect();
          const margin = 20;
          const { vw, vh } = getViewportSize();

          let targetX = rect.left;
          let targetY = rect.top;

          // 窄屏幕时水平居中
          if (vw <= 480 || vw - margin * 2 <= rect.width) {
            targetX = Math.max(margin, Math.round((vw - rect.width) / 2));
          } else {
            if (targetX + rect.width > vw - margin) {
              targetX = vw - margin - rect.width;
            }
            if (targetX < margin) {
              targetX = margin;
            }
          }

          if (targetY + rect.height > vh - margin) {
            targetY = vh - margin - rect.height;
          }
          if (targetY < margin) {
            targetY = margin;
          }

          confirmState.value.position = { x: Math.round(targetX), y: Math.round(targetY) };
        }
      });
    }
  },
);

async function requestUrlContent() {
  const request = await askUrlPrompt();
  if (!request?.url) return;
  await loadUrlContent(request.url.trim(), request.userAgent.trim());
}

function calcPopupPosition(estimatedW = 340, estimatedH = 150) {
  if (!lastClickPos.value || Date.now() - lastClickPos.value.time >= 3000) {
    return null;
  }
  const margin = 20;
  const { vw, vh } = getViewportSize();
  const maxW = Math.min(estimatedW, vw - margin * 2);
  const w = maxW;
  const h = estimatedH;

  const clickX = lastClickPos.value.x;
  const clickY = lastClickPos.value.y;

  let x = clickX - w / 2;
  let y = clickY + 14;

  if (y + h > vh - margin) {
    y = clickY - h - 14;
  }

  // 移动端/窄屏幕时，弹窗左右居中，上下跟随点击位置
  if (vw <= 480 || vw - margin * 2 <= w) {
    x = Math.max(margin, Math.round((vw - w) / 2));
  } else {
    x = Math.max(margin, Math.min(vw - margin - w, x));
  }
  y = Math.max(margin, Math.min(vh - margin - h, y));

  return { x: Math.round(x), y: Math.round(y) };
}

function askPrompt(title, defaultValue = "", hasUserAgent = false) {
  return new Promise((resolve) => {
    const position = calcPopupPosition(360, hasUserAgent ? 210 : 160);
    promptState.value = {
      visible: true,
      title,
      value: defaultValue,
      userAgent: hasUserAgent
        ? localStorage.getItem("codeHubUserAgent") || ""
        : "",
      hasUserAgent,
      hasTags: false,
      tags: [],
      position,
      resolve,
    };
  });
}

function askUrlPrompt() {
  return askPrompt("输入 Github/raw/普通文本链接", "", true);
}

function autoFillScriptHubUserAgent() {
  if (
    promptState.value.hasUserAgent &&
    SCRIPT_HUB_LPX_URL_PATTERN.test(promptState.value.value)
  ) {
    promptState.value.userAgent = SCRIPT_HUB_USER_AGENT;
  }
}

const promptConfirm = () => {
  const { resolve, value, userAgent, hasUserAgent, hasTags, tags } =
    promptState.value;
  promptState.value.visible = false;
  if (hasTags) {
    resolve?.(normalizeTags([...tags, ...value.split(/[,，\s]+/)]));
    return;
  }
  if (hasUserAgent) {
    const trimmedUserAgent = userAgent.trim();
    localStorage.setItem("codeHubUserAgent", trimmedUserAgent);
    resolve?.({ url: value, userAgent: trimmedUserAgent });
    return;
  }
  resolve?.(value);
};
const promptCancel = () => {
  const { resolve } = promptState.value;
  promptState.value.visible = false;
  resolve?.(null);
};
const addPromptTag = () => {
  promptState.value.tags = normalizeTags([
    ...promptState.value.tags,
    ...promptState.value.value.split(/[,，\s]+/),
  ]);
  promptState.value.value = "";
};
const removePromptTag = (tag) => {
  promptState.value.tags = promptState.value.tags.filter(
    (currentTag) => currentTag !== tag,
  );
};
const push_home = () => {
  router.push("/");
};

async function pasteToPromptInput() {
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      promptState.value.value = text;
    }
  } catch {}
}

// 全局记录最近一次用户点击/触摸位置，供 askConfirm 等弹窗使用
const lastClickPos = ref(null);
const recordClickPosition = (e) => {
  if (!e) return;
  const clientX =
    e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : null);
  const clientY =
    e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : null);
  if (clientX != null && clientY != null) {
    lastClickPos.value = {
      x: clientX,
      y: clientY,
      time: Date.now(),
    };
  }
};

function askConfirm(title, inputValue) {
  return new Promise((resolve) => {
    const position = calcPopupPosition(340, inputValue !== undefined ? 170 : 120);
    confirmState.value = {
      visible: true,
      title,
      value: inputValue || "",
      hasInput: inputValue !== undefined,
      position,
      resolve,
    };
  });
}
const confirmYes = () => {
  const { resolve, value, hasInput } = confirmState.value;
  confirmState.value.visible = false;
  resolve?.(hasInput ? value : true);
};
const confirmNo = () => {
  const { resolve, hasInput } = confirmState.value;
  confirmState.value.visible = false;
  resolve?.(hasInput ? null : false);
};
const createId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const toStoredValue = (value) =>
  value == null ? null : JSON.parse(JSON.stringify(toRaw(value)));

const sanitizeGistForStorage = (gist) => {
  if (!gist || typeof gist !== "object") return null;
  const rawGist = toStoredValue(gist);
  const gistHash = rawGist.gistHash || (rawGist.id ? computeGistHash(rawGist.id) : "");
  // 移除真实的 gist.id，改用安全的单向散列 gistHash
  const { id, ...rest } = rawGist;
  return {
    ...rest,
    gistHash,
  };
};

const saveMeta = async (item) => {
  await idbStorage.setItem(metaKey(item.id), {
    name: item.name,
    length: item.length,
    preview: item.preview,
    updatedAt: item.updatedAt,
    language: item.language,
    manualLanguage: item.manualLanguage || "",
    url: item.url || "",
    blobUrl: item.blobUrl || "",
    userAgent: item.userAgent || "",
    gist: sanitizeGistForStorage(item.gist),
    localGroupId: item.localGroupId || "",
    tags: normalizeTags(item.tags),
  });
};

const normalizeTags = (tags) => [
  ...new Set(
    (Array.isArray(tags) ? tags : [])
      .map((tag) => String(tag).trim())
      .filter(Boolean),
  ),
];
const savedItems = ref([]);
const timeSortDescending = ref(true);
const saveSearchQuery = ref("");
const isLoadingSaves = ref(true);
const contentSearchIds = ref(null);
const searchingSavedContent = ref(false);
const selectedTags = ref([]);
const availableTags = computed(() =>
  [
    ...new Set(savedItems.value.flatMap((item) => normalizeTags(item.tags))),
  ].sort((a, b) => a.localeCompare(b, "zh-CN")),
);
const sortedSavedItems = computed(() =>
  [...savedItems.value]
    .filter((item) => {
      const query = saveSearchQuery.value.trim().toLowerCase();
      const matchesInfo = [
        item.name,
        item.preview,
        ...normalizeTags(item.tags),
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query),
      );
      const matchesContent = contentSearchIds.value?.has(item.id) || false;
      const matchesTags =
        selectedTags.value.length === 0 ||
        selectedTags.value.every((tag) =>
          normalizeTags(item.tags).includes(tag),
        );
      return (!query || matchesInfo || matchesContent) && matchesTags;
    })
    .sort(
      (a, b) =>
        (timeSortDescending.value ? 1 : -1) *
        (itemUpdatedAt(b) - itemUpdatedAt(a)),
    ),
);
const showSaves = ref(false);
const toolbarExpanded = ref(false);
const loadingItemId = ref(null);
const refreshingUrlItemId = ref(null);
const selectMode = ref(false);
const syncingItemId = ref(null);
const syncingAction = ref("");
const syncingAllGists = ref(false);
const expandedActionItemId = ref(null);
const actionPanelsReady = ref(false);
const editorReady = ref(false);
const expandedGistIds = ref(new Set());
const expandedItemIds = ref(new Set());
const checkedIds = ref(new Set());
const savesListWidth = ref(0);
const savesListRef = ref(null);
let savesListObserver = null;

// ===== 保存面板拖拽调整高度 =====
const MIN_SAVES_HEIGHT = 57;
const SAVES_HEIGHT_KEY = "codehub_saves_panel_height";
const savesPanelHeight = ref(
  parseInt(localStorage.getItem(SAVES_HEIGHT_KEY), 10) ||
    Math.round(window.innerHeight * 0.3),
);
let savesResizeStartY = 0;
let savesResizeStartHeight = 0;

function startSavesResizePointer(e) {
  e.preventDefault();
  savesResizeStartY = e.clientY;
  savesResizeStartHeight = savesPanelHeight.value;
  document.addEventListener("pointermove", onSavesResizePointer);
  document.addEventListener("pointerup", endSavesResizePointer);
  document.body.style.cursor = "row-resize";
  e.target.setPointerCapture(e.pointerId);
}

function onSavesResizePointer(e) {
  const delta = e.clientY - savesResizeStartY;
  savesPanelHeight.value = Math.max(
    MIN_SAVES_HEIGHT,
    savesResizeStartHeight + delta,
  );
}

function endSavesResizePointer(e) {
  document.removeEventListener("pointermove", onSavesResizePointer);
  document.removeEventListener("pointerup", endSavesResizePointer);
  document.body.style.cursor = "";
  localStorage.setItem(SAVES_HEIGHT_KEY, savesPanelHeight.value.toString());
  if (e?.target) {
    try {
      e.target.releasePointerCapture(e.pointerId);
    } catch {}
  }
}

function cleanupSavesResizeListeners() {
  document.removeEventListener("pointermove", onSavesResizePointer);
  document.removeEventListener("pointerup", endSavesResizePointer);
  document.body.style.cursor = "";
}

// ===== 保存面板拖拽调整宽度（宽屏：面板固定在左侧） =====
const MIN_SAVES_WIDTH = 240;
const MAX_SAVES_WIDTH_RATIO = 0.6;
const SAVES_WIDTH_KEY = "codehub_saves_panel_width";
const savesWidth = ref(
  parseInt(localStorage.getItem(SAVES_WIDTH_KEY), 10) || 400,
);
let savesWidthResizeStartX = 0;
let savesWidthResizeStartWidth = 0;

function applySavesWidth() {
  document.documentElement.style.setProperty(
    "--saves-width",
    savesWidth.value + "px",
  );
}

// ★ 测量顶部导航栏高度，供宽屏分栏时标题栏定位使用
const updateNavHeight = () => {
  const nav = document.querySelector(".blurNavdiv");
  document.documentElement.style.setProperty(
    "--nav-height",
    (nav?.offsetHeight || 0) + "px",
  );
};

function startSavesWidthResizePointer(e) {
  e.preventDefault();
  savesWidthResizeStartX = e.clientX;
  savesWidthResizeStartWidth = savesWidth.value;
  document.addEventListener("pointermove", onSavesWidthResizePointer);
  document.addEventListener("pointerup", endSavesWidthResizePointer);
  document.body.style.cursor = "col-resize";
  e.target.setPointerCapture(e.pointerId);
}

function onSavesWidthResizePointer(e) {
  const delta = e.clientX - savesWidthResizeStartX;
  const maxWidth = Math.round(window.innerWidth * MAX_SAVES_WIDTH_RATIO);
  savesWidth.value = Math.min(
    maxWidth,
    Math.max(MIN_SAVES_WIDTH, savesWidthResizeStartWidth + delta),
  );
  applySavesWidth();
}

function endSavesWidthResizePointer(e) {
  document.removeEventListener("pointermove", onSavesWidthResizePointer);
  document.removeEventListener("pointerup", endSavesWidthResizePointer);
  document.body.style.cursor = "";
  localStorage.setItem(SAVES_WIDTH_KEY, savesWidth.value.toString());
  if (e?.target) {
    try {
      e.target.releasePointerCapture(e.pointerId);
    } catch {}
  }
}

function cleanupSavesWidthResizeListeners() {
  document.removeEventListener("pointermove", onSavesWidthResizePointer);
  document.removeEventListener("pointerup", endSavesWidthResizePointer);
  document.body.style.cursor = "";
}
const toggleSaves = async () => {
  showSaves.value = !showSaves.value;
  await idbStorage.setItem("SHOW_SAVES_KEY", showSaves.value);
  if (showSaves.value) await loadSaves();
};

const toggleSelectMode = () => {
  selectMode.value = !selectMode.value;
  if (!selectMode.value) {
    checkedIds.value.clear();
  }
};

const toggleToolbar = () => {
  toolbarExpanded.value = !toolbarExpanded.value;
  if (!toolbarExpanded.value && selectMode.value) {
    toggleSelectMode();
  }
};

const toggleTimeSort = () => {
  timeSortDescending.value = !timeSortDescending.value;
};

let savedContentSearchTimer = null;
let savedContentSearchRequestId = 0;
const searchSavedContent = () => {
  clearTimeout(savedContentSearchTimer);
  const requestId = ++savedContentSearchRequestId;
  const query = saveSearchQuery.value.trim().toLowerCase();
  if (!query) {
    contentSearchIds.value = null;
    searchingSavedContent.value = false;
    return;
  }
  savedContentSearchTimer = setTimeout(async () => {
    searchingSavedContent.value = true;
    try {
      const matchingIds = new Set();
      for (const item of savedItems.value) {
        const searchable =
          `${item.name || ""}\n${item.preview || ""}\n${normalizeTags(item.tags).join(" ")}`.toLowerCase();
        if (searchable.includes(query)) {
          matchingIds.add(item.id);
          continue;
        }
        const content = await idbStorage.getItem(contentKey(item.id));
        if (
          typeof content === "string" &&
          content.toLowerCase().includes(query)
        )
          matchingIds.add(item.id);
      }
      if (requestId !== savedContentSearchRequestId) return;
      contentSearchIds.value = matchingIds;
    } catch (error) {
      console.error("搜索保存内容失败", error);
      if (requestId !== savedContentSearchRequestId) return;
      contentSearchIds.value = null;
    } finally {
      if (requestId === savedContentSearchRequestId)
        searchingSavedContent.value = false;
    }
  }, 250);
};

const toggleTagFilter = (tag) => {
  selectedTags.value = selectedTags.value.includes(tag)
    ? selectedTags.value.filter((selectedTag) => selectedTag !== tag)
    : [...selectedTags.value, tag];
};

const editItemTags = async (item) => {
  const tags = await askTags(normalizeTags(item.tags));
  if (!tags) return;
  item.tags = tags;
  await saveMeta(item);
  showToast("已更新标签");
};

const askTags = (tags) =>
  new Promise((resolve) => {
    const position = calcPopupPosition(360, 220);
    promptState.value = {
      visible: true,
      title: "修改标签",
      value: "",
      userAgent: "",
      hasUserAgent: false,
      hasTags: true,
      tags,
      position,
      resolve,
    };
  });

const isItemActionsExpanded = (item) => expandedActionItemId.value === item.id;
const toggleItemActions = async (item) => {
  if (isItemActionsExpanded(item)) {
    expandedActionItemId.value = null;
    return;
  }
  expandedActionItemId.value = item.id;
  await loadItemForList(item);
};

const hydrateGistDetails = async (items) => {
  try {
    const cachedGists = await idbStorage.getItem(GIST_LIST_KEY);
    if (!Array.isArray(cachedGists) || cachedGists.length === 0) return items;

    const gistHashMap = new Map();
    const gistIdMap = new Map();
    for (const g of cachedGists) {
      if (g?.id) {
        gistHashMap.set(computeGistHash(g.id), g);
        gistIdMap.set(g.id, g);
      }
    }

    return items.map((item) => {
      if (!item.gist) return item;
      const matchedGist =
        (item.gist.gistHash && gistHashMap.get(item.gist.gistHash)) ||
        (item.gist.id && gistIdMap.get(item.gist.id));

      if (matchedGist) {
        return {
          ...item,
          gist: {
            ...item.gist,
            id: matchedGist.id,
            htmlUrl: item.gist.htmlUrl || matchedGist.html_url || "",
            description: item.gist.description || matchedGist.description || matchedGist.desc || "",
            user: item.gist.user || matchedGist.user || matchedGist.owner?.login || "",
          },
        };
      }
      return item;
    });
  } catch (e) {
    console.warn("hydrateGistDetails failed", e);
    return items;
  }
};

const loadSaves = async () => {
  isLoadingSaves.value = true;
  try {
    const list = await idbStorage.getItem(SAVES_INDEX_KEY);
    const parsedIndex = parseSavesIndex(list);
    const ids = parsedIndex.items.map((it) => it.id);
    const itemIndexMap = new Map(parsedIndex.items.map((it) => [it.id, it]));

    const metaEntries = await Promise.all(
      ids.map(async (id) => {
        try {
          const meta = await idbStorage.getItem(metaKey(id));
          if (meta) {
            const indexItem = itemIndexMap.get(id);
            return {
              id,
              ...meta,
              cf_meta: indexItem?.cf_meta === true,
              cf_content: indexItem?.cf_content === true,
              tags: normalizeTags(
                meta.tags?.length
                  ? meta.tags
                  : meta.gist
                    ? ["Gist"]
                    : meta.url
                      ? ["Url"]
                      : ["CH"],
              ),
            };
          }
          return null;
        } catch {
          return null;
        }
      }),
    );
    let items = metaEntries.filter(Boolean);

    // ★ 索引恢复：仅当列表为空时扫描 IDB 中的 meta/content 键，找回索引丢失的项
    if (items.length === 0) {
      try {
        const allKeys = await idbStorage.getAllKeys();
        const existingIds = new Set(items.map((i) => i.id));
        let recovered = 0;

        for (const key of allKeys) {
          if (typeof key !== "string") continue;

          if (key.startsWith("codehub_save_meta:")) {
            const id = getLogicalFileId(key);
            if (!existingIds.has(id)) {
              const meta = await idbStorage.getItem(key);
              if (meta) {
                items.push({ id, ...meta });
                existingIds.add(id);
                recovered++;
              }
            }
          } else if (key.startsWith("codehub_save_content:")) {
            const id = getLogicalFileId(key);
            if (!existingIds.has(id)) {
              const content = await idbStorage.getItem(key);
              if (typeof content === "string" && content.length > 0) {
                items.push({
                  id,
                  name: `recovered_${id}`,
                  length: content.length,
                  preview: content.slice(0, 100).replace(/\s+/g, " "),
                  updatedAt: Date.now(),
                  language: "",
                  manualLanguage: "",
                  url: "",
                  blobUrl: "",
                });
                existingIds.add(id);
                recovered++;
              }
            }
          }
        }

        if (recovered > 0) {
          console.log(`索引恢复：找回 ${recovered} 个丢失的项`);
        }
      } catch (e) {
        console.error("索引恢复扫描失败", e);
      }
    }

    items = await hydrateGistDetails(items);

    // ★ 自动去重与归一化：清除历史因切片错误导致的同一文件重复分裂（meta 与 content 变成两个独立项）
    const cleanItems = [];
    const seenItemIds = new Set();
    for (const it of items) {
      const lid = getLogicalFileId(it?.id);
      if (!lid || seenItemIds.has(lid)) continue;
      seenItemIds.add(lid);
      cleanItems.push({ ...it, id: lid });
    }
    const hadDuplicates = cleanItems.length !== items.length;
    items = cleanItems;
    savedItems.value = items;

    if (hadDuplicates || !list || !list.version || list.version < 2) {
      await persistIndex();
    }
  } catch (error) {
    console.error("读取保存列表失败", error);
    savedItems.value = [];
  } finally {
    isLoadingSaves.value = false;
    await loadTrashList();
  }
};

const persistIndex = async () => {
  const currentItems = savedItems.value;
  // ★ 防御：空列表写入前检查 IDB 是否仍有数据，防止意外清空索引
  if (currentItems.length === 0) {
    const allKeys = await idbStorage.getAllKeys();
    const hasData = allKeys.some(
      (k) => typeof k === "string" && k.startsWith("codehub_save_meta:"),
    );
    if (hasData) {
      console.warn("persistIndex: 拒绝写入空索引，IDB 中仍有保存数据");
      return;
    }
  }

  // 获取当前已有索引中的分项同步状态，避免保存时丢失状态
  const existingRawIndex = await idbStorage.getItem(SAVES_INDEX_KEY);
  const existingParsed = parseSavesIndex(existingRawIndex);
  const existingSyncMap = new Map(existingParsed.items.map((it) => [it.id, it]));

  const seenIds = new Set();
  const dedupedItems = [];
  for (const it of currentItems) {
    const lid = getLogicalFileId(it?.id);
    if (!lid || seenIds.has(lid)) continue;
    seenIds.add(lid);
    dedupedItems.push({ ...it, id: lid });
  }

  const leanIndex = {
    version: 2,
    updatedAt: Date.now(),
    items: dedupedItems.map((item) => {
      const existing = existingSyncMap.get(item.id);
      return {
        id: item.id,
        name: item.name || "",
        updatedAt: item.updatedAt || Date.now(),
        ...(item.gist ? { isGist: true } : {}),
        ...(item.cf_meta === true || existing?.cf_meta === true ? { cf_meta: true } : {}),
        ...(item.cf_content === true || existing?.cf_content === true ? { cf_content: true } : {}),
      };
    }),
  };

  await idbStorage.setItem(SAVES_INDEX_KEY, leanIndex);
};

const buildMeta = (content) => ({
  length:
    typeof content === "string"
      ? content.length
      : content
        ? String(content).length
        : 0,
  preview:
    typeof content === "string"
      ? content.slice(0, 123).replace(/\s+/g, " ").slice(0, 100)
      : "",
  updatedAt: Date.now(),
  language: cmStore.activeLanguage,
  manualLanguage: cmStore.manualLanguage || "",
});

const itemUpdatedAt = (item) =>
  Number(item.gist?.updatedAt || item.updatedAt || 0);
const gistPath = (item) => {
  const folderName =
    item.gist?.description ||
    item.gist?.folderName ||
    item.gist?.filename ||
    item.name;
  const fileName = item.gist?.filename || item.name;
  return folderName === fileName ? fileName : `${folderName}/${fileName}`;
};
const hasLocalContent = (item) => item.gist?.downloaded === true;
const hasUrlAndGist = (item) => Boolean(item.url && item.gist?.rawUrl);

const groupKey = (it) =>
  it?.gist?.id
    ? `g:${it.gist.id}`
    : it?.localGroupId
      ? `l:${it.localGroupId}`
      : null;

const groupIndex = computed(() => {
  const map = new Map();
  for (const it of savedItems.value) {
    const key = groupKey(it);
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(it);
  }
  return map;
});

const gistItems = (gistId) =>
  gistId ? groupIndex.value.get(`g:${gistId}`) || [] : [];
const groupItems = (item) => {
  const key = groupKey(item);
  return key ? groupIndex.value.get(key) || [item] : [item];
};
const isGistPrimary = (item) => groupItems(item)[0]?.id === item.id;
const groupFileName = (item) => item.gist?.filename || item.name;

// 子项预计算，避免模板中 getItemChildrenCount + gistChildItems 重复计算和逐项 Set 构建
const childrenIndex = computed(() => {
  const res = new Map();
  for (const [, list] of groupIndex.value) {
    if (!list || list.length === 0) continue;
    const seen = new Set([groupFileName(list[0])]);
    const children = list.slice(1).filter((c) => {
      const fn = groupFileName(c);
      if (seen.has(fn)) return false;
      seen.add(fn);
      return true;
    });
    res.set(list[0].id, children);
  }
  return res;
});

const gistChildItems = (item) => childrenIndex.value.get(item.id) || [];
const getItemChildrenCount = (item) => gistChildItems(item).length;
const shouldShowSavedItem = (item) => isGistPrimary(item);
const primarySavedItems = computed(() =>
  sortedSavedItems.value.filter(isGistPrimary),
);
const localExpansionId = (item) => item.localGroupId || item.id;
const isItemExpanded = (item) =>
  item.gist?.id
    ? expandedGistIds.value.has(item.gist.id)
    : expandedItemIds.value.has(localExpansionId(item));

const toggleGistFiles = (gistId) => {
  if (expandedGistIds.value.has(gistId)) {
    expandedGistIds.value.delete(gistId);
  } else {
    expandedGistIds.value.add(gistId);
  }
};

const toggleItemExpansion = (item) => {
  if (item.gist?.id) {
    toggleGistFiles(item.gist.id);
    return;
  }
  const groupId = localExpansionId(item);
  if (expandedItemIds.value.has(groupId)) {
    expandedItemIds.value.delete(groupId);
  } else {
    expandedItemIds.value.add(groupId);
  }
};

const createExpandedFile = async (item) => {
  if (item.gist?.id) {
    const groupItem = gistItems(item.gist.id)[0] || item;
    await createGistFile(groupItem);
    return;
  }
  await createLocalGroupFile(item);
};

const createLocalGroupFile = async (item) => {
  const name = await askPrompt("新建关联文件名");
  if (!name?.trim()) return;
  const localGroupId = item.localGroupId || `local:${item.id}`;
  const filename = toGistFileName(name.trim());
  if (groupItems({ localGroupId }).some((child) => child.name === filename)) {
    showToast("该关联文件已存在");
    return;
  }
  try {
    if (!item.localGroupId) {
      item.localGroupId = localGroupId;
      await saveMeta(item);
    }
    const child = {
      id: createId(),
      name: filename,
      ...buildMeta(""),
      localGroupId,
      tags: ["CH"],
      language: "plaintext",
    };
    await idbStorage.setItem(contentKey(child.id), "");
    savedItems.value.push(child);
    await saveMeta(child);
    await persistIndex();
    await loadItem(child);
    showToast("已新建本地关联文件");
  } catch (error) {
    console.error("新建本地关联文件失败", error);
    showToast("新建本地关联文件失败");
  }
};

const createGistFile = async (item) => {
  const name = await askPrompt("新建 Gist 文件名");
  if (!name?.trim()) return;
  const filename = toGistFileName(name.trim());
  const id = getGistItemId(item.gist.id, filename);
  if (savedItems.value.some((savedItem) => savedItem.id === id)) {
    showToast("该 Gist 文件已存在");
    return;
  }
  try {
    const child = {
      id,
      name: filename,
      ...buildMeta(""),
      tags: ["Gist"],
      gist: {
        id: item.gist.id,
        folderName: item.gist.folderName,
        filename,
        rawUrl: "",
        description: item.gist.description || "",
        updatedAt: Date.now(),
        downloaded: true,
      },
    };
    await idbStorage.setItem(contentKey(child.id), "");
    savedItems.value.push(child);
    await saveMeta(child);
    await persistIndex();
    await loadItem(child);
    showToast("已新建本地 Gist 文件");
  } catch (error) {
    console.error("新建 Gist 文件失败", error);
    showToast("新建 Gist 文件失败");
  }
};

const getGistCredentials = () => {
  try {
    const token = JSON.parse(localStorage.getItem("GistUserT") || "null")?.t;
    const username = localStorage.getItem("GistUserN") || "";
    return { token, username };
  } catch {
    return { token: "", username: "" };
  }
};

const toGistFileName = (name) =>
  (name || "CodeHub.txt").replace(/[\\/:*?"<>|]/g, "_");

const confirmUploadToGist = async (item) => {
  const description = await askConfirm(
    "上传到 Gist 会覆盖远端 Gist",
    item.gist?.description || "",
  );
  if (description === null) return;
  await uploadItemToGist(item, description.trim());
};

const confirmDownloadFromGist = async (item) => {
  if (await askConfirm("从 Gist 拉取会覆盖本地内容")) {
    await downloadGistItem(item, true);
  }
};

const confirmRefreshFromUrl = async (item) => {
  if (await askConfirm("从 URL 拉取会覆盖本地内容")) {
    await refreshUrlItem(item);
  }
};

const updateGistDescriptionLocally = async (gistId, description) => {
  const items = gistItems(gistId);
  await Promise.all(
    items.map(async (gistItem) => {
      gistItem.gist.description = description;
      gistItem.gist.folderName = description || gistItem.gist.folderName;
      await saveMeta(gistItem);
    }),
  );
  await persistIndex();
};

const uploadItemToGist = async (item, description) => {
  const { token } = getGistCredentials();
  if (!token) {
    showToast("请先在设置中配置 Gist Token");
    return;
  }
  syncingItemId.value = item.id;
  syncingAction.value = "upload";
  try {
    if (currentItemId.value === item.id) {
      cmViewRef.value?.flushStoreSync?.();
    }
    const content =
      currentItemId.value === item.id
        ? cmStore.CmCode || ""
        : (await idbStorage.getItem(contentKey(item.id))) || "";
    if (!content.trim()) {
      showToast("上传文件内容为空");
      return;
    }
    if (!description) {
      showToast("请填写 Gist desc");
      return;
    }
    item.gist = { ...(item.gist || {}), description };
    const filename = toGistFileName(item.name);
    const gistId = item.gist?.id;
    const previousFilename = item.gist?.filename;
    const files = { [filename]: { content } };
    if (gistId && previousFilename && previousFilename !== filename) {
      files[previousFilename] = null;
    }
    const response = await sendReq(
      gistId ? "PATCH" : "POST",
      gistId
        ? `https://api.github.com/gists/${gistId}`
        : "https://api.github.com/gists",
      {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
      JSON.stringify({
        description: item.gist?.description || `Code Hub`,
        public: false,
        files,
      }),
    );
    if (response.status !== 200 && response.status !== 201)
      throw new Error(response.status || "请求失败");

    const remoteFile = response.data?.files?.[filename];
    item.gist = {
      id: response.data?.id || gistId,
      folderName:
        response.data?.description ||
        Object.keys(response.data?.files || {})[0] ||
        filename,
      filename,
      rawUrl: toStableGistRawUrl(remoteFile?.raw_url || item.gist?.rawUrl),
      htmlUrl: response.data?.html_url || item.gist?.htmlUrl || "",
      description: response.data?.description || item.gist?.description || "",
      updatedAt: new Date(response.data?.updated_at || Date.now()).getTime(),
      downloaded: true,
    };
    item.tags = normalizeTags([
      ...normalizeTags(item.tags).filter(
        (tag) => tag !== "CH" && tag !== "Url",
      ),
      "Gist",
    ]);
    item.name = filename;
    const previousId = item.id;
    const nextId = getGistItemId(item.gist.id, filename);
    if (previousId !== nextId) {
      if (gistId && previousFilename && previousFilename !== filename) {
        await renameGistFileInCodeHub(item.gist.id, previousFilename, filename);
      } else {
        await moveCodeHubItemId(previousId, nextId);
      }
      item.id = nextId;
      if (currentItemId.value === previousId) currentItemId.value = item.id;
    }
    await updateGistDescriptionLocally(item.gist.id, item.gist.description);
    await prependGistFileToCache(response.data, filename, remoteFile);
    await saveMeta(item);
    await persistIndex();
    await scrollToSavedItem(item.id);
    showToast(
      gistId
        ? previousFilename && previousFilename !== filename
          ? "已重命名并更新 Gist"
          : "已更新到 Gist"
        : "已上传到 Gist",
    );
  } catch (error) {
    console.error("上传 Gist 失败", error);
    showToast(
      String(error?.message) === "422"
        ? "上传文件内容为空 Err 422"
        : "上传 Gist 失败",
    );
  } finally {
    syncingItemId.value = null;
    syncingAction.value = "";
  }
};

const downloadGistItem = async (
  item,
  loadAfterDownload = false,
  { notify = true } = {},
) => {
  if (!item.gist?.rawUrl) return;
  syncingItemId.value = item.id;
  syncingAction.value = "gist";
  try {
    if (loadAfterDownload && currentItemId.value === item.id && isDirty) {
      await syncCurrentItemContent();
      isDirty = false;
    }
    const rawUrl = toStableGistRawUrl(item.gist.rawUrl);
    if (item.gist.rawUrl !== rawUrl) item.gist.rawUrl = rawUrl;
    const response = await sendReq("GET", rawUrl);
    if (response.status !== 200) throw new Error(response.status || "请求失败");
    const content =
      typeof response.data === "string"
        ? response.data
        : JSON.stringify(response.data, null, 2);
    await idbStorage.setItem(contentKey(item.id), content);
    Object.assign(item, {
      length: content.length,
      preview: content.slice(0, 123).replace(/\s+/g, " ").slice(0, 100),
      updatedAt: Number(item.gist.updatedAt) || Date.now(),
    });
    item.gist.downloaded = true;
    await saveMeta(item);
    await persistIndex();
    if (loadAfterDownload) {
      await loadItem(item);
    } else if (currentItemId.value === item.id) {
      isSwitchingItem = true;
      cmStore.setCmCode(content);
      lastSavedContent.value = content;
      isSwitchingItem = false;
    }
    if (notify) showToast("已下载到本地");
    return true;
  } catch (error) {
    console.error("下载 Gist 失败", error);
    if (notify) showToast("下载 Gist 失败");
    return false;
  } finally {
    syncingItemId.value = null;
    syncingAction.value = "";
  }
};

const downloadAllGists = async () => {
  const { token, username } = getGistCredentials();
  if (!username || !token) {
    showToast("请先在设置中配置 Gist 用户名和 Token");
    return;
  }

  syncingAllGists.value = true;
  try {
    const gists = [];
    for (let page = 1; ; page++) {
      const response = await sendReq(
        "GET",
        `https://api.github.com/users/${username}/gists?per_page=100&page=${page}`,
        {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      );
      if (response.status !== 200 || !Array.isArray(response.data))
        throw new Error(response.status || "请求失败");
      if (response.data.length === 0) break;

      gists.push(
        ...response.data.map(
          ({
            id,
            html_url,
            files,
            public: isPublic,
            created_at,
            updated_at,
            description,
            owner,
          }) => ({
            id,
            html_url,
            files,
            filesNames: Object.keys(files || {}),
            primaryFilename: Object.keys(files || {})[0] || "",
            public: isPublic,
            created_at,
            updated_at,
            updatedAt: new Date(updated_at).getTime(),
            desc: description,
            description,
            user: owner?.login || username,
          }),
        ),
      );
      if (response.data.length < 100) break;
    }
    await syncGistFilesToCodeHub(gists, { replace: true });
    await idbStorage.setItem(GIST_LIST_KEY, gists);
    await loadSaves();
    showToast(`已同步 ${gists.length} 个 Gist`);
  } catch (error) {
    console.error("拉取全部 Gist 失败", error);
    showToast("拉取全部 Gist 失败");
  } finally {
    syncingAllGists.value = false;
  }
};

const handleItemAction = async (item) => {
  if (item.gist?.rawUrl && !hasLocalContent(item)) {
    await downloadGistItem(item, true);
    return;
  }
  if (item.id === currentItemId.value) {
    if (item.url) await refreshUrlItem(item);
    else await renameItem(item);
    return;
  }
  await loadItem(item);
};

const loadItemForList = async (item) => {
  if (item.gist?.rawUrl && !hasLocalContent(item)) {
    await downloadGistItem(item, true);
    return;
  }
  await loadItem(item);
};

const createNewBlank = async () => {
  if (currentItemId.value && !cmStore.CmCode) {
    showToast("已经是新建状态");
    return;
  }

  clearTimeout(autosaveTimer);

  // ★ 新建文件清除手动语言（需在 buildMeta 之前）
  cmStore.setManualLanguage("");

  const usedNumbers = savedItems.value
    .map((savedItem) => /^CH_(\d+)(?:\.txt)?$/i.exec(savedItem.name)?.[1])
    .filter(Boolean)
    .map(Number);
  const defaultName = `CH_${String(Math.max(0, ...usedNumbers) + 1).padStart(3, "0")}.txt`;
  const item = {
    id: createId(),
    name: defaultName,
    ...buildMeta(EMPTY_CONTENT),
    tags: ["CH"],
    language: "plaintext",
  };

  try {
    await idbStorage.setItem(contentKey(item.id), "");

    savedItems.value.unshift(item);
    await saveMeta(item);
    await persistIndex();

    // 先滚动列表到顶部再加载 cmView
    await nextTick();
    if (savesListRef.value) {
      savesListRef.value.scrollTop = 0;
    }
    await nextTick();

    skipWatchSave = true;

    await setCurrentItem(item.id, item.name);

    cmViewRef.value?.loadContent?.(EMPTY_CONTENT, {
      fileName: item.name,
      manualLanguage: "",
      skipHistory: true,
    });
    lastSavedContent.value = EMPTY_CONTENT;

    await idbStorage.setItem(contentKey(item.id), EMPTY_CONTENT);

    isDirty = false;
    expandedActionItemId.value = item.id;

    nextTick(() => {
      skipWatchSave = false;
    });
  } catch (e) {
    console.log(e);
    showToast("新建失败");
  }
};

// ★ 单条删除
const deleteSingleItem = async (item) => {
  const ok = await askConfirm(`确定删除 "${item.name}" 吗？`);
  if (!ok) return;
  if (item.gist?.id) {
    const { token } = getGistCredentials();
    if (!token) {
      showToast("请先在设置中配置 Gist Token");
      return;
    }
    const gistItemsToDelete = gistItems(item.gist.id);
    const isLastGistFile = gistItemsToDelete.length <= 1;
    try {
      const response = await sendReq(
        isLastGistFile ? "DELETE" : "PATCH",
        `https://api.github.com/gists/${item.gist.id}`,
        {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
        isLastGistFile
          ? undefined
          : JSON.stringify({ files: { [item.gist.filename]: null } }),
      );
      const remoteMissing = response.status === 404;
      if (response.status !== 204 && response.status !== 200 && !remoteMissing)
        throw new Error(response.status || "请求失败");
      const deletedFiles =
        remoteMissing || isLastGistFile ? undefined : [item.gist.filename];
      const removedIds = await removeGistFilesFromCodeHub(
        item.gist.id,
        deletedFiles,
      );
      await removeGistFilesFromCache(item.gist.id, deletedFiles);
      const removed = new Set(removedIds);
      savedItems.value = savedItems.value.filter(
        (savedItem) => !removed.has(savedItem.id),
      );
      if (currentItemId.value && removed.has(currentItemId.value))
        await setCurrentItem(null, "");
      showToast(
        remoteMissing
          ? "远程 Gist 不存在，已清理本地数据"
          : isLastGistFile
            ? "已删除远程 Gist"
            : "已删除远程 Gist 文件",
      );
      return;
    } catch (error) {
      console.error("删除远程 Gist 失败", error);
      showToast("删除远程 Gist 失败");
      return;
    }
  }
  try {
    await markCodeHubItemsDeleted([item.id]);
  } catch (error) {
    console.error("删除失败", error);
  }
  savedItems.value = savedItems.value.filter((i) => i.id !== item.id);
  await persistIndex();

  if (currentItemId.value === item.id) {
    await setCurrentItem(null, "");
  }
  showToast("已删除");
};

const deleteSelected = async () => {
  if (checkedIds.value.size === 0) {
    showToast("请先勾选要删除的项");
    return;
  }
  const ids = [...checkedIds.value];
  const ok = await askConfirm(
    `确定要删除选中的 ${ids.length} 项吗？此操作不可恢复。`,
  );
  if (!ok) return;

  const items = savedItems.value.filter((item) =>
    checkedIds.value.has(item.id),
  );
  const currentItemWasDeleted = currentItemId.value
    ? ids.includes(currentItemId.value)
    : false;
  if (items.some((item) => item.gist?.id)) {
    showToast("远程 Gist 文件请使用单条删除");
    return;
  }
  try {
    await Promise.all(
      ids.map((id) =>
        markCodeHubItemsDeleted([id]),
      ),
    );
  } catch (error) {
    console.error("删除内容失败", error);
  }
  savedItems.value = savedItems.value.filter(
    (item) => !checkedIds.value.has(item.id),
  );
  checkedIds.value.clear();
  await persistIndex();

  if (currentItemWasDeleted) {
    await setCurrentItem(null, "");
  }

  showToast(`已删除 ${ids.length} 项`);
};

// ★ 修复：loadItem 加载大文件前通知 cmView 延迟语言同步
const LARGE_FILE_THRESHOLD = 1.4 * 1024 * 1024;

const loadItem = async (item) => {
  // ★ 切换文件前先刷新防抖 store 同步，确保当前编辑内容已保存
  cmViewRef.value?.flushStoreSync?.();
  // 刷新后再保存当前项（如果有）
  if (isDirty && currentItemId.value) {
    await syncCurrentItemContent();
  }

  loadingItemId.value = item.id;

  try {
    const content = await idbStorage.getItem(contentKey(item.id));

    // Gist 拉取时只登记元数据；未下载前不能把空编辑器内容写回本地缓存。
    if (item.gist && typeof content !== "string") {
      showToast("这是 Gist 远程文件，请先点击下载");
      return;
    }

    // 🔥 切换期间抑制自动保存 watch，避免内容设置触发 isDirty / 错误保存
    isSwitchingItem = true;
    await cmViewRef.value?.loadContent?.(content || EMPTY_CONTENT, {
      fileName: item.name,
      manualLanguage: item.manualLanguage || "",
      skipHistory: true,
    });

    await setCurrentItem(item.id, item.name);

    lastSavedContent.value = content || EMPTY_CONTENT;

    nextTick(() => {
      clearTimeout(autosaveTimer);
      isDirty = false;
    });

    showToast("已加载：" + item.name);
  } catch (e) {
    console.log(e);
    showToast("加载失败");
  } finally {
    loadingItemId.value = null;
    isSwitchingItem = false;
  }
};

async function copyUrl(item, type) {
  const text =
    type === "html"
      ? item.gist?.htmlUrl
      : type === "gist"
        ? item.gist?.rawUrl
        : type === "blob"
          ? item.blobUrl
          : item.url;
  if (!text) return;
  try {
    await toClipboard(text);
    const label =
      type === "html"
        ? "Html URL"
        : type === "blob"
          ? "Blob URL"
          : type === "gist"
            ? "Gist URL"
            : item.blobUrl
              ? "Raw URL"
              : "URL";
    showToast(`已复制 ${label}`);
  } catch {
    showToast("复制失败");
  }
}

const SCRIPT_HUB_LPX_URL_PATTERN = /.+pages\.dev.+\.lpx/;
const SCRIPT_HUB_USER_AGENT = "script-hub/1.0.0";

function getForwardRequestUrl(url, userAgent = "") {
  const ts = Date.now();
  if (!userAgent) return `https://fetch${ts}.linkey.com/api/fetch?url=${url}`;
  const linkeyHeaders = encodeURIComponent(
    JSON.stringify({ "User-Agent": userAgent }),
  );
  return `https://fetch${ts}.linkey.com/api/fetch?url=${url}&linkeyheaders=${linkeyHeaders}`;
}

async function refreshUrlItem(item) {
  if (!item.url) return;
  refreshingUrlItemId.value = item.id;
  try {
    let currentURL = item.url;
    const userAgent =
      item.userAgent ||
      (SCRIPT_HUB_LPX_URL_PATTERN.test(currentURL)
        ? SCRIPT_HUB_USER_AGENT
        : "");
    let res = userAgent ? null : await sendReq("GET", currentURL);
    if (!res || !res.data) {
      const localURL = getForwardRequestUrl(currentURL, userAgent);
      showToast("模块请求转发中…");
      res = await sendReq("GET", localURL);
    }
    if (!res || !res.data) {
      showToast("请求失败");
      return;
    }
    let content = res.data;
    if (typeof content !== "string") {
      content = JSON.stringify(content, null, 2);
    }
    await idbStorage.setItem(contentKey(item.id), content);
    item.length = content.length;
    item.preview = content.slice(0, 123).replace(/\s+/g, " ").slice(0, 100);
    item.updatedAt = Date.now();
    await saveMeta(item);
    await persistIndex();

    // ★ 用 URL 的文件名/后缀设置语言识别用的文件名，列表名不变
    const urlFileName = getFileNameFromUrl(item.url || "");

    isSwitchingItem = true;
    await cmViewRef.value?.loadContent?.(content, {
      fileName: urlFileName,
      manualLanguage: item.manualLanguage || "",
      skipHistory: true,
    });
    await setCurrentItem(item.id, urlFileName);
    lastSavedContent.value = content;
    await nextTick();
    clearTimeout(autosaveTimer);
    isDirty = false;
    isSwitchingItem = false;
    showToast("已刷新：" + item.name);
  } catch (e) {
    console.log(e);
    showToast("刷新失败");
    isSwitchingItem = false;
  } finally {
    refreshingUrlItemId.value = null;
  }
}

const renameItem = async (item) => {
  const newName = await askPrompt("重命名", item.name);
  if (!newName || newName === item.name) return;
  const name = item.gist?.id ? toGistFileName(newName) : newName;
  const previousId = item.id;
  if (item.gist?.id && item.gist.filename !== name) {
    const previousFilename = item.gist.filename;
    const { token } = getGistCredentials();
    if (!token) {
      showToast("请先在设置中配置 Gist Token");
      return;
    }
    syncingItemId.value = item.id;
    syncingAction.value = "rename";
    try {
      const response = await sendReq(
        "PATCH",
        `https://api.github.com/gists/${item.gist.id}`,
        {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
        JSON.stringify({
          files: {
            [previousFilename]: { filename: name },
          },
        }),
      );
      if (response.status !== 200)
        throw new Error(response.status || "请求失败");
      const remoteFile = response.data?.files?.[name];
      if (!remoteFile?.raw_url) throw new Error("未获取到文件地址");
      await renameGistFileInCodeHub(item.gist.id, previousFilename, name);
      item.id = getGistItemId(item.gist.id, name);
      item.gist = {
        ...item.gist,
        filename: name,
        rawUrl: toStableGistRawUrl(remoteFile.raw_url),
        updatedAt: new Date(response.data?.updated_at || Date.now()).getTime(),
      };
    } catch (error) {
      console.error("重命名 Gist 文件失败", error);
      showToast("重命名 Gist 文件失败");
      return;
    } finally {
      syncingItemId.value = null;
      syncingAction.value = "";
    }
  }
  item.name = name;
  if (currentItemId.value === previousId) {
    currentItemId.value = item.id;
    cmStore.setCurrentFileName(name);
  }
  await saveMeta(item);
  await persistIndex();
  showToast("已重命名为 " + newName);
};

const allChecked = computed(
  () =>
    savedItems.value.length > 0 &&
    checkedIds.value.size === savedItems.value.length,
);
const toggleCheckAll = () => {
  checkedIds.value = allChecked.value
    ? new Set()
    : new Set(savedItems.value.map((i) => i.id));
};

function truncateUrl(url) {
  if (!url) return url;
  // savesListWidth ≈ 容器可用宽度，按钮区域约 120px、padding 约 24px
  const availableWidth = Math.max(100, savesListWidth.value - 150);
  // 11px 字体平均字符宽约 6.2px
  const maxChars = Math.floor(availableWidth / 6.2);
  if (url.length <= maxChars) return url;
  const front = Math.floor(maxChars * 0.55);
  const back = maxChars - front - 3;
  return url.slice(0, front) + "..." + url.slice(-back);
}

function formatBytes(length) {
  if (!length) return "0 B";
  if (length < 1024) return length + " B";
  if (length < 1024 * 1024) return (length / 1024).toFixed(1) + " KB";
  return (length / (1024 * 1024)).toFixed(2) + " MB";
}

const timeFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function formatTime(ts) {
  if (!ts) return "";
  try {
    return timeFormatter.format(ts);
  } catch {
    return "";
  }
}
// ===== 保存列表 end =====

// ===== 当前文件追踪 / 自动保存 =====
const LAST_OPENED_KEY = "codehub_last_opened_id";
const currentItemId = ref(null);

const setCurrentItem = async (id, fileName = "") => {
  saveRequestId++;
  currentItemId.value = id;
  cmStore.setCurrentFileName(fileName);
  try {
    if (id) {
      await idbStorage.setItem(LAST_OPENED_KEY, id);
    } else {
      await idbStorage.removeItem(LAST_OPENED_KEY);
    }
  } catch (error) {
    console.error("记录最后打开项失败", error);
  }
};

let isDirty = false;
let saveRequestId = 0;

const hasCurrentItemChanges = (item, content) =>
  content !== lastSavedContent.value ||
  (cmStore.currentFileName || item.name) !== item.name ||
  (cmStore.manualLanguage || "") !== (item.manualLanguage || "");

const syncCurrentItemContent = async () => {
  const id = currentItemId.value;
  if (!id) return;
  if (!isDirty) return;
  const requestId = ++saveRequestId;

  // ★ 大文件编辑后先刷新 store，确保拿到最新的编辑内容
  cmViewRef.value?.flushStoreSync?.();

  const content = cmStore.CmCode || "";

  try {
    const idx = savedItems.value.findIndex((i) => i.id === id);
    if (idx === -1) return;
    if (requestId !== saveRequestId || currentItemId.value !== id) return;
    if (!hasCurrentItemChanges(savedItems.value[idx], content)) {
      isDirty = false;
      return;
    }

    if (content !== lastSavedContent.value) {
      await idbStorage.setItem(contentKey(id), content);
      if (requestId !== saveRequestId || currentItemId.value !== id) return;
      lastSavedContent.value = content;
    }

    isDirty = false;

    savedItems.value[idx] = {
      ...savedItems.value[idx],
      name: cmStore.currentFileName || savedItems.value[idx].name,
      ...buildMeta(content),
    };

    if (requestId !== saveRequestId || currentItemId.value !== id) return;

    await saveMeta(savedItems.value[idx]);
    await persistIndex();
  } catch (e) {
    console.log(e);
  }
};

let autosaveTimer = null;

const AUTOSAVE_BASE_DELAY = 800;
const getAutosaveDelay = (length) => {
  if (length > 2000000) return 3000;
  if (length > 500000) return 1500;
  return AUTOSAVE_BASE_DELAY;
};

watch(
  () => cmStore.CmCode,
  (newVal) => {
    if (skipWatchSave || isSwitchingItem) return;
    if (!currentItemId.value) return;

    isDirty = true;

    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(
      () => {
        syncCurrentItemContent();
      },
      getAutosaveDelay(newVal?.length || 0),
    );
  },
);

watch(
  () => cmStore.currentFileName,
  () => {
    if (skipWatchSave || isSwitchingItem) return;
    if (!currentItemId.value) return;

    isDirty = true;

    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
      syncCurrentItemContent();
    }, AUTOSAVE_BASE_DELAY);
  },
);

// ★ 手动语言变化时自动入库
watch(
  () => cmStore.manualLanguage,
  () => {
    if (skipWatchSave || isSwitchingItem) return;
    if (!currentItemId.value) return;

    isDirty = true;

    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
      syncCurrentItemContent();
    }, AUTOSAVE_BASE_DELAY);
  },
);

const flushCurrentSave = async () => {
  clearTimeout(autosaveTimer);
  const id = currentItemId.value;
  if (!id || !isDirty) return;
  console.log("flush length:", cmStore.CmCode?.length);
  const content = cmStore.CmCode;
  if (content == null) return;
  try {
    const idx = savedItems.value.findIndex((i) => i.id === id);
    if (idx !== -1) {
      if (!hasCurrentItemChanges(savedItems.value[idx], content)) {
        isDirty = false;
        return;
      }
      if (content !== lastSavedContent.value) {
        await idbStorage.setItem(contentKey(id), content);
        lastSavedContent.value = content;
      }
      isDirty = false;
      savedItems.value[idx] = {
        ...savedItems.value[idx],
        name: cmStore.currentFileName || savedItems.value[idx].name,
        ...buildMeta(content),
      };
      await saveMeta(savedItems.value[idx]);
      await persistIndex();
    }
  } catch (error) {
    console.error("退出前保存失败", error);
  }
};

const handleVisibilityChange = () => {
  if (document.visibilityState === "hidden") {
    flushCurrentSave();
  }
};
const handleBeforeUnload = () => {
  flushCurrentSave();
};
// ===== 当前文件追踪 end =====

// ===== 导入 / 导出文件 =====
const importInputRef = ref(null);
const backupRestoreInputRef = ref(null);
const backupInProgress = ref(false);
const restoreInProgress = ref(false);
const CODEHUB_BACKUP_FILE = "codehub-backup.json";
const CODEHUB_BACKUP_VERSION = 1;

const triggerImport = () => {
  importInputRef.value?.click();
};

const downloadBlob = (filename, blob) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const backupDatabase = async () => {
  if (backupInProgress.value) return;
  backupInProgress.value = true;
  try {
    await flushCurrentSave();
    const entries = await idbStorage.getAllEntries();
    const zip = new JSZip();
    zip.file(
      CODEHUB_BACKUP_FILE,
      JSON.stringify({
        format: "LinKey-CodeHub-Backup",
        version: CODEHUB_BACKUP_VERSION,
        createdAt: new Date().toISOString(),
        entries,
      }),
    );
    const blob = await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });
    downloadBlob(
      `CodeHub_backup_${new Date().toISOString().replace(/[:.]/g, "-")}.zip`,
      blob,
    );
    showToast(`已备份 ${entries.length} 项数据库数据`);
  } catch (error) {
    console.error("备份数据库失败", error);
    showToast("备份失败");
  } finally {
    backupInProgress.value = false;
  }
};

const triggerBackupRestore = () => {
  backupRestoreInputRef.value?.click();
};

const onBackupRestoreFileChange = async (event) => {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  if (!(await askConfirm("恢复备份会覆盖当前所有 Code Hub 数据，是否继续？")))
    return;

  restoreInProgress.value = true;
  try {
    const zip = await JSZip.loadAsync(file);
    const backupFile = zip.file(CODEHUB_BACKUP_FILE);
    if (!backupFile) throw new Error("不是 Code Hub 备份文件");
    const backup = JSON.parse(await backupFile.async("string"));
    const isValid =
      backup?.format === "LinKey-CodeHub-Backup" &&
      backup.version === CODEHUB_BACKUP_VERSION &&
      Array.isArray(backup.entries);
    if (
      !isValid ||
      backup.entries.some((entry) => !entry || typeof entry.key !== "string")
    )
      throw new Error("备份文件格式无效");

    await flushCurrentSave();
    await idbStorage.replaceAllEntries(backup.entries);
    currentItemId.value = null;
    isDirty = false;
    lastSavedContent.value = "";
    await loadSaves();
    showToast(`已恢复 ${backup.entries.length} 项数据库数据`);
  } catch (error) {
    console.error("恢复数据库备份失败", error);
    showToast(
      error?.message === "不是 Code Hub 备份文件" ||
        error?.message === "备份文件格式无效"
        ? error.message
        : "恢复失败",
    );
  } finally {
    restoreInProgress.value = false;
  }
};

const onImportFileChange = async (e) => {
  const file = e.target.files?.[0];
  e.target.value = "";
  if (!file) return;

  try {
    const text = await file.text();

    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    await idbStorage.setItem(contentKey(id), text);
    savedItems.value.unshift({
      id,
      name: file.name,
      ...buildMeta(text),
      tags: ["CH"],
    });
    await saveMeta(savedItems.value[0]);
    await persistIndex();

    // 先滚动列表到顶部并确保列表渲染完成，再加载 cmView
    await nextTick();
    if (savesListRef.value) {
      savesListRef.value.scrollTop = 0;
    }
    await nextTick();

    isSwitchingItem = true;
    await cmViewRef.value?.loadContent?.(text, {
      fileName: file.name,
      manualLanguage: "",
      skipHistory: true,
    });
    await setCurrentItem(id, file.name);
    lastSavedContent.value = text;
    clearTimeout(autosaveTimer);
    isDirty = false;
    isSwitchingItem = false;
    expandedActionItemId.value = id;

    showToast("已导入：" + file.name);
  } catch (error) {
    console.error("导入文件失败", error);
    showToast("导入失败：无法以文本方式读取该文件");
    isSwitchingItem = false;
  }
};

const downloadTextFile = (filename, content) => {
  const blob = new Blob([content], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const buildExportFilename = (name, fallbackBase = "CH") => {
  return (name || fallbackBase).replace(/[\\/:*?"<>|]/g, "_");
};

const dedupeFilename = (name, usedNames) => {
  if (!usedNames.has(name)) return name;
  const dotIndex = name.lastIndexOf(".");
  const base = dotIndex > 0 ? name.slice(0, dotIndex) : name;
  const ext = dotIndex > 0 ? name.slice(dotIndex) : "";
  let suffix = 1;
  let candidate = `${base}_${suffix}${ext}`;
  while (usedNames.has(candidate)) {
    suffix++;
    candidate = `${base}_${suffix}${ext}`;
  }
  return candidate;
};

const exportCurrent = () => {
  const content = cmStore.CmCode || "";
  if (!content) {
    showToast("当前内容为空，无需导出");
    return;
  }
  const fallbackName = `CH_${new Date()
    .toLocaleString("zh-CN")
    .replace(/[^\d\s]/g, "")
    .replace(/\D/g, "_")}`;
  const finalName = buildExportFilename(
    cmStore.currentFileName || fallbackName,
  );
  downloadTextFile(finalName, content);
  showToast("已导出");
};

const exportSelected = async () => {
  if (checkedIds.value.size === 0) {
    showToast("请先勾选要导出的项");
    return;
  }
  const ids = [...checkedIds.value];
  const items = savedItems.value.filter((item) =>
    checkedIds.value.has(item.id),
  );

  if (items.length === 1) {
    const item = items[0];
    try {
      const content = await idbStorage.getItem(contentKey(item.id));
      const finalName = buildExportFilename(item.name);
      downloadTextFile(finalName, content || "");
      showToast("已导出");
    } catch (error) {
      console.error("导出失败：" + item.name, error);
      showToast("导出失败");
    }
    return;
  }

  const zip = new JSZip();
  const usedNames = new Set();
  let okCount = 0;

  for (const item of items) {
    try {
      const content = await idbStorage.getItem(contentKey(item.id));
      let finalName = buildExportFilename(item.name);
      finalName = dedupeFilename(finalName, usedNames);
      usedNames.add(finalName);
      zip.file(finalName, content || "");
      okCount++;
    } catch (error) {
      console.error("打包失败：" + item.name, error);
    }
  }

  if (okCount === 0) {
    showToast("导出失败");
    return;
  }

  showToast("正在打包…");

  try {
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CodeHub_${Date.now()}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`已打包导出 ${okCount}/${items.length} 项`);
  } catch (error) {
    console.error("生成压缩包失败", error);
    showToast("生成压缩包失败");
  }
};
// ===== 导入 / 导出文件 end =====

const rePwa = async () => {
  showToast("正在重置 PWA缓存...");

  if ("serviceWorker" in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const r of regs) {
      await r.unregister();
    }
  }

  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  }

  // 强制阻止旧 SW 复活
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: "SKIP_WAITING" });
  }

  showToast("重置完成");
  setTimeout(() => (location.href = location.href + "?t=" + Date.now()), 300);
};

function getFileNameFromUrl(url) {
  try {
    const pathname = new URL(url).pathname;
    let name = pathname.split("/").pop() || "";
    name = decodeURIComponent(name);
    if (!name) {
      name = `CH_${new Date()
        .toLocaleString("zh-CN")
        .replace(/[^\d\s]/g, "")
        .replace(/\D/g, "_")}.txt`;
    }
    return name;
  } catch {
    return `CH_${new Date()
      .toLocaleString("zh-CN")
      .replace(/[^\d\s]/g, "")
      .replace(/\D/g, "_")}.txt`;
  }
}

let xc = `/* 快捷方式
- 高亮
- 撤销
- 反向撤销
- 格式化 [Js / Json / 换行]
- 搜索 [查找替换/大小写匹配/全匹配/正则匹配]
- 复制
- 清空
- 粘贴
*/

// 链接快捷预览
// http://localhost:5173/EditCode

// 代码折叠
function a(i) {
  return [...new Set(i)].join('')
}

const arr = [1, 2, 3, 4, 2, 5, 6, 3]
console.log(a(arr))

console.log(new Date().toLocaleString('zh-CN'))

const x = 'Hello '
console.log( x + Date.now() )
// console.error(x)

const i = {
  username: 'Key',
  autoTheme: true,
  o: {
    a: 1,
    c: [ "1", "a", "2"]
  }
}
console.log(i.o.c[2])


// console.log(JSON.stringify(i,null,2))


// This is an example




















// end`;

async function loadUrlContent(inputUrl, inputUserAgent = "") {
  let addedItemId = null;
  try {
    let currentURL = inputUrl;
    let bloburl = "";

    if (!/^https?:\/\//.test(currentURL)) {
      showToast("链接无效");
      return;
    }

    if (/^https:\/\/github\.com\/.+?\/(blob|raw)\//.test(currentURL)) {
      bloburl = currentURL;
      currentURL = currentURL
        .replace(/\/(blob|raw)/, "")
        .replace("github.com", "raw.githubusercontent.com");
    } else if (/^https:\/\/raw\.githubusercontent\.com\//.test(currentURL)) {
      bloburl = extractAndFormatUrl(currentURL);
    }

    const userAgent =
      inputUserAgent ||
      (SCRIPT_HUB_LPX_URL_PATTERN.test(currentURL)
        ? SCRIPT_HUB_USER_AGENT
        : "");
    showToast("请求中");

    let res = userAgent ? null : await sendReq("GET", currentURL);
    if (!res || !res.data) {
      const localURL = getForwardRequestUrl(currentURL, userAgent);
      showToast("模块请求转发中…");
      res = await sendReq("GET", localURL);
    }

    if (!res || !res.data) {
      showToast("请求失败");
      return;
    }

    let content = res.data;
    if (typeof content !== "string") {
      content = JSON.stringify(content, null, 2);
    }

    const fileName = getFileNameFromUrl(bloburl || currentURL);
    const id = createId();
    addedItemId = id;
    // ★ 新 URL 清除手动语言（需在 buildMeta 之前）
    cmStore.setManualLanguage("");
    const item = {
      id,
      name: fileName,
      ...buildMeta(content),
      tags: ["Url"],
      url: currentURL,
      blobUrl: bloburl,
      userAgent,
    };

    await idbStorage.setItem(contentKey(id), content);
    savedItems.value.unshift(item);
    await saveMeta(item);
    await persistIndex();

    // 先滚动列表到顶部并确保列表渲染完成，再加载 cmView
    await nextTick();
    if (savesListRef.value) {
      savesListRef.value.scrollTop = 0;
    }
    await nextTick();

    isSwitchingItem = true;
    await cmViewRef.value?.loadContent?.(content, {
      fileName,
      manualLanguage: "",
      skipHistory: true,
    });
    await setCurrentItem(id, fileName);
    lastSavedContent.value = content;
    isDirty = false;
    isSwitchingItem = false;
    expandedActionItemId.value = id;

    showToast("载入成功");
  } catch (e) {
    console.log(e);
    showToast("请求失败");
    isSwitchingItem = false;
    // ★ 失败时清理可能残留的临时项，防止幽灵项
    if (addedItemId) {
      savedItems.value = savedItems.value.filter((i) => i.id !== addedItemId);
      try {
        await idbStorage.removeItem(contentKey(addedItemId));
        await idbStorage.removeItem(metaKey(addedItemId));
      } catch {}
    }
  }
}
onMounted(async () => {
  window.addEventListener("editor-theme-change", updateEditorPageBackground);
  applySavesWidth(); // ★ 初始化侧边栏宽度 CSS 变量
  updateNavHeight(); // ★ 初始化导航栏高度 CSS 变量
  window.addEventListener("resize", updateNavHeight);
  const blurNavdiv = document.querySelector(".blurNavdiv");
  blurNavdiv?.classList.add("blurNavdiv_code");
  let currentURL = "",
    ua = "";
  try {
    if (route.query?.url) {
      currentURL = route.query?.url;
      currentURL = currentURL.replace(/^.*?(?=https?)/, ""); // q ng
    } else if (Object.keys(route.query).length > 0) {
      currentURL = Object.keys(route.query)[0];
      currentURL = currentURL.replace(/^.*?(?=https?)/, "");
      if (currentURL.startsWith("http")) {
        currentURL = decodeURIComponent(currentURL);
      } else {
        currentURL = "";
      }
    } else {
      currentURL = "";
    }
  } catch (error) {}
  try {
    ua = decodeURIComponent(route.query?.ua) || "";
  } catch (error) {}

  console.log("检测到 URL 参数，尝试加载：" + currentURL + " " + ua);

  let bloburl = "";
  const state = await idbStorage.getItem("SHOW_SAVES_KEY");
  const shouldRestoreSavesPanel = state === true;
  // ★ 先加载已有列表，再处理 URL 请求，避免 loadUrlContent 的 persistIndex 覆盖已有索引
  await loadSaves();
  let urlLoaded = false;
  try {
    if (currentURL) {
      await loadUrlContent(currentURL, ua);
      urlLoaded = true;
    }
  } catch {}

  const cc = cmStore.CmCode;
  let initialCode;

  if (urlLoaded) {
    // ★ URL 已由 loadUrlContent 完成加载，无需再走后续恢复逻辑
    initialCode = cmStore.CmCode;
  } else if (israw.value) {
    const fileName = getFileNameFromUrl(bloburl || currentURL);
    const id = createId();
    cmStore.setManualLanguage("");
    const item = {
      id,
      name: fileName,
      ...buildMeta(grc.value),
    };
    await idbStorage.setItem(contentKey(id), grc.value);
    savedItems.value.unshift(item);
    await saveMeta(item);
    await persistIndex();
    await setCurrentItem(id, fileName);
    lastSavedContent.value = grc.value;
    clearTimeout(autosaveTimer);
    isDirty = false;
    initialCode = grc.value;
  } else {
    // ★ 始终从 LAST_OPENED_KEY 恢复，避免导航回退时读到 Pinia 的旧缓存
    let lastId = null;
    try {
      lastId = await idbStorage.getItem(LAST_OPENED_KEY);
    } catch (error) {
      console.error("读取最后打开项失败", error);
    }

    let lastItem = lastId
      ? savedItems.value.find((item) => item.id === lastId)
      : null;
    let lastContent = null;
    if (lastItem) {
      try {
        lastContent = await idbStorage.getItem(contentKey(lastId));
      } catch (error) {
        console.error("读取最后打开内容失败", error);
      }
    }

    if (lastItem) {
      initialCode =
        typeof lastContent === "string" ? lastContent : EMPTY_CONTENT;
      currentItemId.value = lastId;
      cmStore.setCurrentFileName(lastItem.name);
      cmStore.setManualLanguage(lastItem.manualLanguage || "");
      console.log("0 已默认载入最后打开的内容");
    } else if (savedItems.value.length > 0) {
      const fallbackItem = [...savedItems.value].sort(
        (a, b) => itemUpdatedAt(b) - itemUpdatedAt(a),
      )[0];
      const fallbackContent = await idbStorage.getItem(
        contentKey(fallbackItem.id),
      );
      initialCode =
        typeof fallbackContent === "string" ? fallbackContent : EMPTY_CONTENT;
      await setCurrentItem(fallbackItem.id, fallbackItem.name);
      cmStore.setManualLanguage(fallbackItem.manualLanguage || "");
      console.log("0 最后打开项不存在，已载入列表中的最近文件");
    } else if (cc != "") {
      // ★ 没有 LAST_OPENED_KEY 但 Pinia 有缓存时，用它兜底
      initialCode = cc;
    } else {
      const storedUsername = await idbStorage.getItem("codehub");
      if (storedUsername) {
        initialCode = storedUsername;
        cmStore.setCurrentFileName("");
        cmStore.setManualLanguage("");
        console.log("0 读取到草稿数据");
      } else {
        initialCode = xc;
        const firstId = createId();
        const firstName = "example.js";
        cmStore.setCurrentFileName(firstName);
        cmStore.setManualLanguage("");
        await idbStorage.setItem(contentKey(firstId), xc);
        savedItems.value.unshift({
          id: firstId,
          name: firstName,
          ...buildMeta(xc),
        });
        await saveMeta(savedItems.value[0]);
        await persistIndex();
        await setCurrentItem(firstId, firstName);
      }
    }
  }

  // ★ URL 加载已由 loadUrlContent 完成设置，跳过重复赋值避免触发多余 watcher
  if (!urlLoaded) {
    isSwitchingItem = true;
    cmStore.setCmCode(initialCode);
    lastSavedContent.value = initialCode || EMPTY_CONTENT;
    isDirty = false;
    isSwitchingItem = false;
  }

  // 进入页面时恢复上次打开文件的操作区。
  expandedActionItemId.value = currentItemId.value;
  showSaves.value = shouldRestoreSavesPanel;
  await nextTick();
  actionPanelsReady.value = true;
  editorReady.value = true;

  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("beforeunload", handleBeforeUnload);
  window.addEventListener("pointerdown", recordClickPosition, true);

  // 监听 saves-list 宽度变化，动态计算 URL 截断长度
  savesListObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      savesListWidth.value = entry.contentRect.width;
    }
  });
  if (savesListRef.value) {
    savesListObserver.observe(savesListRef.value);
  }

  // ★ 初始加载完成后，如果有当前项且面板显示，滚动到该项
  scrollToCurrentItem();

  // ★ 每次进入时后台静默拉取云端 index 进行差异比对并提示（若开启自动检查）
  if (isCodeHubSyncAutoCheckEnabled()) {
    checkRemoteSync();
  }
});

// ★ 面板打开/关闭时，打开后自动滚动到当前项
watch(showSaves, (visible) => {
  if (visible) {
    nextTick(scrollToCurrentItem);
  }
});

function scrollToCurrentItem() {
  scrollToSavedItem(currentItemId.value);
}

async function scrollToSavedItem(id) {
  if (!id || !savesListRef.value) return;
  await nextTick();
  const el = [...savesListRef.value.querySelectorAll("[data-save-id]")].find(
    (item) => item.dataset.saveId === id,
  );
  el?.scrollIntoView?.({ block: "nearest", behavior: "auto" });
}

function extractAndFormatUrl(rawUrl) {
  const regex =
    /https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)/;
  const match = rawUrl.match(regex);
  if (match) {
    return `https://github.com/${match[1]}/${match[2]}/blob/${match[3]}/${match[4]}`;
  } else return "Invalid URL";
}

let _sandboxWorker = null;
function getSandboxWorker() {
  if (!_sandboxWorker) {
    const w = new Worker(new URL("./sandboxWorker.js", import.meta.url), {
      type: "module",
    });
    _sandboxWorker = { worker: w, pending: null };
    w.onmessage = (e) => {
      _sandboxWorker.pending?.resolve(e.data);
      _sandboxWorker.pending = null;
    };
    w.onerror = () => {
      console.log("Worker 加载失败");
      _sandboxWorker.pending?.reject(new Error("Worker 加载失败"));
      _sandboxWorker.pending = null;
    };
  }
  return _sandboxWorker;
}

function executeInMainThread(code, onLog) {
  return new Promise((resolve) => {
    const logs = [];
    const timers = {};

    const emit = (msg) => {
      logs.push(msg);
      onLog?.(msg);
    };

    const formatArg = (function () {
      var _visited = new WeakSet();
      return function (arg) {
        if (arg === null) return "null";
        if (arg === undefined) return "undefined";
        if (arg instanceof Error)
          return arg.stack || arg.name + ": " + arg.message;
        if (typeof arg === "object") {
          if (_visited.has(arg)) return "[circular]";
          _visited.add(arg);
          try {
            var s = JSON.stringify(arg, null, 2);
            _visited.delete(arg);
            return s;
          } catch (e) {
            _visited.delete(arg);
            return "[recursive/error]";
          }
        }
        return String(arg);
      };
    })();

    const mockConsole = {
      log: (...args) => emit(args.map(formatArg).join(" ")),
      error: (...args) => emit("[Error] " + args.map(formatArg).join(" ")),
      warn: (...args) => emit("[Warn] " + args.map(formatArg).join(" ")),
      info: (...args) => emit("[Info] " + args.map(formatArg).join(" ")),
      debug: (...args) => emit("[Debug] " + args.map(formatArg).join(" ")),
      trace: (...args) => emit("[Trace] " + args.map(formatArg).join(" ")),
      dir: (obj) => emit(formatArg(obj)),
      table: (data) => {
        if (Array.isArray(data)) {
          emit(
            "[Table]\n" +
              data.map((row, i) => `  ${i}: ${formatArg(row)}`).join("\n"),
          );
        } else {
          emit("[Table]\n" + formatArg(data));
        }
      },
      clear: () => {
        logs.length = 0;
      },
      time: (label) => {
        timers[String(label)] = performance.now();
      },
      timeEnd: (label) => {
        const key = String(label);
        const elapsed =
          timers[key] != null
            ? (performance.now() - timers[key]).toFixed(2)
            : "?";
        emit(`${key}: ${elapsed} ms`);
        delete timers[key];
      },
      count: (label) => {
        const key = String(label ?? "default");
        timers[key] = (timers[key] ?? 0) + 1;
        emit(`${key}: ${timers[key]}`);
      },
      group: () => {},
      groupEnd: () => {},
    };

    var _execError = null;
    var _execResult = null;
    var _savedConsole = window.console;
    window.console = mockConsole;
    try {
      _execResult = (0, eval)(
        "(async function(console){try{\n" +
          code +
          "\n}catch(e){try{console.error('[Uncaught] '+(e&&e.stack?e.stack:(e&&e.message?e.message:e)))}catch(_){}}})",
      )(mockConsole);
    } catch (e) {
      _execError = e;
    }
    if (_execError) {
      window.console = _savedConsole;
      logs.push("[Build Error] " + _formatError(_execError));
      resolve({ logs });
      return;
    }

    if (!_execResult || typeof _execResult.then !== "function") {
      window.console = _savedConsole;
      logs.push("[Debug] fn returned non-thenable: " + String(_execResult));
      resolve({ logs });
      return;
    }

    setTimeout(function () {
      _execResult
        .then(function () {
          _finishResolve();
        })
        .catch(function (e) {
          logs.push("[Exception] " + _formatError(e));
          _finishResolve();
        });
    }, 0);

    setTimeout(function () {
      _safeResolve();
    }, 60000);

    function _finishResolve() {
      try {
        var _sp = typeof self !== "undefined" ? self.__surge_pending : 0;
        if (typeof _sp === "number" && _sp > 0) {
          self.__surge_on_idle = function () {
            _safeResolve();
          };
          setTimeout(function () {
            if (self.__surge_on_idle) {
              self.__surge_on_idle = null;
              _safeResolve();
            }
          }, 15000);
        } else {
          _safeResolve();
        }
      } catch (e2) {
        logs.push("[Finish Error] " + _formatError(e2));
        _safeResolve();
      }
    }

    function _safeResolve() {
      window.console = _savedConsole;
      try {
        resolve({ logs });
      } catch (e) {}
    }

    function _formatError(e) {
      try {
        if (!e) return String(e);
        if (e && e.stack) return String(e.stack).slice(0, 500);
        if (e && e.message) return String(e.message).slice(0, 500);
        return String(e).slice(0, 500);
      } catch (_) {
        return "unknown";
      }
    }
  });
}

const goFunction = async () => {
  const code = cmStore.CmCode;
  if (!code || !code.trim()) {
    showToast("没有可执行的代码");
    return;
  }

  // 重置实时日志
  logAllReactive.value = "";
  logTime.value = new Date().toLocaleString("zh-CN", { hour12: false });
  showlog.value = true;

  try {
    const { logs } = await executeInMainThread(code, (msg) => {
      // 实时刷新
      logAllReactive.value += "· " + msg + "\n";
      // 自动滚动到底部
      nextTick(() => {
        const el = logBodyRef.value;
        if (el) el.scrollTop = el.scrollHeight;
      });
    });

    // 确保最终完整输出
    if (logs && logs.length) {
      const full = "· " + logs.join("\n· ");
      logAllReactive.value = full + "\n";
    } else if (!logAllReactive.value) {
      logAllReactive.value = "· (无输出)\n";
    }
  } catch (error) {
    logAllReactive.value +=
      "· [Exception] " + (error.message || "执行失败") + "\n";
  }

  // 最终滚动到底部
  await nextTick();
  const el = logBodyRef.value;
  if (el) el.scrollTop = el.scrollHeight;
};

const copyText = async (i) => {
  if (i?.length > 0) {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("不支持原生剪贴板");
      await navigator.clipboard.writeText(i);
    } catch {
      showToast("复制失败，请使用 HTTPS 或授予剪贴板权限");
      return;
    }
    showToast("已复制字符串数: " + i.length);
  }
};

const updateEditorPageBackground = () => {
  if (isDarkModeEnabled.value) {
    const background = localStorage.getItem("EditorDarkBackground");
    document.body.style.backgroundColor = [
      "#282c34",
      "#141414",
      "#000000",
    ].includes(background)
      ? background
      : "#282c34";
    // document.documentElement.style.backgroundColor = "#282c34";
  } else {
    document.body.style.backgroundColor = "#f3f3f3";
    // document.documentElement.style.backgroundColor = "#f3f3f3";
  }
};

watchEffect(() => {
  updateEditorPageBackground();
});

onBeforeUnmount(() => {
  cleanupDragListeners();
  cleanupResizeListeners();
  cleanupSavesResizeListeners();
  cleanupSavesWidthResizeListeners();
  cmViewRef.value?.flushStoreSync?.(); // ★ 确保最后编辑内容同步到 store
  flushCurrentSave();
  document.removeEventListener("visibilitychange", handleVisibilityChange);
  window.removeEventListener("beforeunload", handleBeforeUnload);
  window.removeEventListener("pointerdown", recordClickPosition, true);
  window.removeEventListener("editor-theme-change", updateEditorPageBackground);
  window.removeEventListener("resize", updateNavHeight);
  document.body.style.backgroundColor = "";
  const blurNavdiv = document.querySelector(".blurNavdiv");
  blurNavdiv?.classList.remove("blurNavdiv_code");
  if (savesListObserver) {
    savesListObserver.disconnect();
    savesListObserver = null;
  }
  if (_sandboxWorker?.worker) {
    try {
      _sandboxWorker.worker.terminate();
    } catch {}
    _sandboxWorker = null;
  }
});
</script>

<style lang="css">
.edit-code-editor {
  padding-top: 30px;
}

.edit-code-editor-toggle {
  display: inline-block;
  padding: 6px 10px;
  color: var(--text);
  font-size: 16px;
  line-height: 1;
  opacity: 0.4;
  cursor: pointer;
}

.edit-code-editor-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: auto;
  color: var(--text);
}

.edit-code-editor-add {
  width: 30px;
  height: 30px;
  padding: 1px 0 5px 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  appearance: none;
  -webkit-appearance: none;
  color: var(--text);
  font-size: 22px;
  font-weight: 400;
  line-height: 1;
  opacity: 0.55;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

@media (hover: hover) and (pointer: fine) {
  .edit-code-editor-add:hover {
    background: #8f98c61a;
    opacity: 0.9;
  }
}

.edit-code-editor-add:active {
  animation: edit-code-editor-add-press 300ms ease-out;
}

.edit-code-scroll {
  width: 100%;
  min-width: 0;
  min-height: 0;
  box-sizing: border-box;
  overflow: visible;
}

@keyframes edit-code-editor-add-press {
  0% {
    background: #8f98c61a;
    opacity: 0.9;
    transform: scale(0.9);
  }
  100% {
    background: transparent;
    opacity: 0.55;
    transform: scale(1);
  }
}

.saves-panel {
  /* width: 92%; */
  margin: 0 1% 4% 1%;
  /* margin-bottom: 13px; */
  display: flex;
  flex-direction: column;
  background: transparent;

  z-index: 996;
  position: relative;
  line-height: 16px;
  border-radius: 23px;
  /* box-shadow: 0 0 2px #919db687; */
  box-shadow: 0px 10px 10px -10px #919db695;
}

.saves-panel-header {
  display: none;
}

.saves-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px 11px;
  border-bottom: 0px solid rgba(128, 128, 128, 0);
  flex-wrap: wrap;
}

.saves-body {
  overflow: hidden;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.saves-btn {
  position: relative;
  font-size: 13px;
  padding: 5px 8px;
  height: 29px;
  line-height: 19px;
  box-sizing: border-box;
  border-radius: 14px;
  border: 0px;
  background: #8f98c60b;
  color: var(--text);
  flex: 1 1 0;
  min-width: 0;
  white-space: nowrap;
  transition:
    background-color 160ms ease,
    color 160ms ease;
}

.saves-btn-badge {
  position: absolute;
  top: 3px;
  right: 4px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #ff5252;
}

@media (hover: hover) and (pointer: fine) {
  .saves-btn:hover {
    background: #8f98c61c;
  }
}

.saves-toolbar-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1 0 100%;
  min-width: 0;
  margin-top: 2px;
}

.saves-toolbar-search {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 4 1 0;
  min-width: 0;
  position: relative;
}

.saves-toolbar-filters {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1 0 100%;
  margin-top: 2px;
}

.saves-search-input {
  flex: 1;
  min-width: 0;
  height: 29px;
  padding: 6px 76px 6px 11px;
  box-sizing: border-box;
  border: 0;
  border-radius: 14px;
  outline: none;
  background: #8f98c60e;
  color: var(--text);
  font-size: 13px;
}

.saves-search-status {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  white-space: nowrap;
  font-size: 12px;
  opacity: 0.65;
}

.saves-filter-label {
  flex: 0 0 auto;
  font-size: 12px;
  opacity: 0.65;
}

.saves-toolbar-filters {
  flex-wrap: wrap;
}

.saves-filter-btn,
.saves-item-tags {
  border: 0;
  border-radius: 10px;
  background: #8f98c61a;
  color: var(--text);
  font-size: 9px;
  line-height: 1;
}

.saves-filter-btn {
  padding: 4px 7px;
}

.saves-filter-btn.active {
  background: #8f98c64a;
}

.saves-item-tags {
  display: inline-block;
  width: fit-content;
  margin-left: 5px;
  margin-top: 2px;
  vertical-align: middle;
  opacity: 0.72;
}

.saves-item-tag {
  display: inline-block;
  margin-right: 3px;
  padding: 1.5px 5px;
  border-radius: 8px;
  background: #8f98c61a;
  color: var(--text);
}

.saves-item-tag:last-child {
  margin-right: 0;
}

.saves-item-tag-gist {
  background: rgba(211, 146, 74, 0.2);
  color: #c27a2e;
}

.saves-item-tag-ch {
  background: rgba(82, 118, 181, 0.2);
  color: #5276b5;
}

.saves-item-tag-url {
  background: rgba(67, 156, 113, 0.2);
  color: #348d61;
}

.saves-item-tag-cf {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 1.5px 4px;
  background: rgba(255, 153, 17, 0.15);
  vertical-align: middle;
  line-height: 1;

  .saves-item-cf-icon {
    width: 14px;
    height: 9px;
    display: inline-block;
    vertical-align: middle;
    object-fit: contain;
    pointer-events: none;
  }
}

.saves-item-child-count {
  display: inline-block;
  margin-left: 4px;
  padding: 2px 5px;
  border-radius: 8px;
  background: rgba(92, 125, 190, 0.2);
  color: var(--text);
  font-size: 9px;
  line-height: 1;
  margin-top: 2px;
  vertical-align: middle;
  opacity: 0.75;
}

.saves-btn:disabled {
  opacity: 0.4;
}

.saves-btn-danger {
  color: #e25555;
  border-color: #e2555566;
}

.saves-check-all {
  display: flex;
  align-items: center;
  font-size: 13px;
  opacity: 0.8;
}

.saves-list {
  overflow-y: auto;
  /* ★ 横向溢出一律隐藏，避免子列/按钮把列表撑出屏幕 */
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  padding: 4px 0;
  flex: 1;
  min-height: 0;
}

.saves-empty {
  padding: 20px 0;
  text-align: center;
  opacity: 0.5;
  font-size: 13px;
}

.saves-empty-enter-active,
.saves-empty-leave-active,
.saves-item-enter-active,
.saves-item-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.saves-empty-enter-from,
.saves-empty-leave-to,
.saves-item-enter-from,
.saves-item-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.saves-resize-handle {
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 90px;
  height: 40px;
  cursor: row-resize;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  background: transparent;
}

.saves-resize-bar {
  position: absolute;
  bottom: 17px;
  left: 50%;
  transform: translateX(-50%);
  width: 90px;
  height: 4px;
  border-radius: 2px;
  background: rgba(128, 128, 128, 0.35);
  transition: background 0.15s;
}

.saves-resize-handle:hover .saves-resize-bar,
.saves-resize-handle:active .saves-resize-bar {
  background: rgba(128, 128, 128, 0.55);
}

.saves-item {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  padding: 12px;
  position: relative;
  /* ★ 作为子列(gist child)/flex 项时允许收缩，不被内容撑破 */
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
}

/* 底部横线：左右各留 10px 边距 */
.saves-item::after {
  content: "";
  position: absolute;
  left: 13px;
  right: 12px;
  bottom: 0;
  height: 1px;
  background: rgba(128, 128, 128, 0.1);
  pointer-events: none;
}

.saves-item > input[type="checkbox"] {
  position: absolute;
  top: 13px;
  left: 12px;
}

.saves-item:has(> input[type="checkbox"]) .saves-item-info {
  padding-left: 22px;
}

.saves-item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
  color: var(--van-cell-text-color);
}

/* ★ 所有子元素禁止把容器撑破，允许收缩并按容器宽度约束 */
.saves-item-info > * {
  min-width: 0;
  max-width: 100%;
}

.saves-item-name {
  margin-top: -2px;
  padding-bottom: 4px;
  font-size: 14px;
  font-weight: 600;
  /* display: flex; */
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding-right: 12px;
  opacity: 0.8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: normal;
  /* ★ 超长文件名/标签允许断行，避免撑出屏幕 */
  overflow-wrap: anywhere;
  /* font-family: "SF Mono", "Fira Code", "Consolas", monospace; */
}

.saves-item-source {
  display: inline-block;
  flex: 0 0 auto;
  max-width: 100%;
  padding: 1px 5px;
  border-radius: 8px;
  background: rgba(211, 146, 74, 0.1);
  color: #c27a2e9c;
  font-size: 9px;
  font-weight: 600;
  line-height: 1.1;
  margin-top: 2px;
  white-space: normal;
  overflow: hidden;
  overflow-wrap: anywhere;
}

/* .saves-item-name-span { */
/* background: #7088d827;
  border-radius: 20px;
  padding: 4px 8px 4px 8px;  */
/* } */

.saves-item-preview {
  margin-top: 3px;
  font-size: 12px;
  opacity: 0.7;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  /* ★ 长内容一律在容器内截断，防止超出屏幕 */
  max-width: 100%;
  min-width: 0;
  font-family: "SF Mono", "Fira Code", "Consolas", monospace;
}

.saves-item-preview:has(.saves-url-line) {
  white-space: normal;
  overflow: visible;
}

.saves-url-line {
  cursor: pointer;
  text-decoration: underline;
  opacity: 0.7;
  font-size: 11px;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  /* ★ URL 文本超长时截断，不撑破容器 */
  max-width: 100%;
}

.saves-url-line:hover {
  opacity: 1;
}

.saves-item-content-preview {
  margin-top: 3px;
  font-size: 12px;
  opacity: 0.7;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.saves-item-meta {
  margin-top: 2px;
  font-size: 10.5px;
  font-family: "SF Mono", "Fira Code", "Consolas", monospace;
  opacity: 0.5;
}

.saves-item-sync-actions {
  display: grid;
  grid-template-rows: 1fr;
  align-items: center;
  overflow: hidden;
  /* ★ grid 内按钮行同样允许收缩 */
  min-width: 0;
  max-width: 100%;
  /* ★ grid 行列间距兜底：即使子层结构变化，两行按钮之间也有间距 */
  row-gap: 10px;
  column-gap: 7px;
}

.saves-item-sync-actions-content {
  min-height: 0;
  min-width: 0;
  max-width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  /* ★ 允许左右按钮组整体换行，避免按钮过多时整行溢出屏幕 */
  flex-wrap: wrap;
  gap: 7px;
  /* ★ 左右两组换行时的上下间距也加大 */
  row-gap: 10px;
}

.saves-actions-enter-active,
.saves-actions-leave-active {
  transition:
    grid-template-rows 0.22s cubic-bezier(0.22, 1, 0.36, 1),
    margin-top 0.22s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.16s ease-out;
}

.saves-actions-enter-from,
.saves-actions-leave-to {
  grid-template-rows: 0fr;
  margin-top: -8px;
  opacity: 0;
}

.saves-actions-enter-to,
.saves-actions-leave-from {
  grid-template-rows: 1fr;
  margin-top: 0;
  opacity: 1;
}

.saves-item-action-group {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  /* ★ 上下（行）间距加大，按钮换行后不至于挤在一起 */
  row-gap: 10px;
  align-items: center;
  /* ★ 允许组收缩，避免与另一组挤在一起时溢出屏幕 */
  min-width: 0;
}

.saves-item-action-group-right {
  justify-content: flex-end;
  /* ★ 右侧组空间不足时整体换到下一行 */
  flex: 1 1 auto;
}

.saves-sync-btn {
  min-width: 34px;
  padding: 3px 7px;
  border: 0;
  border-radius: 15px;
  background: rgba(92, 125, 190, 0.12);
  color: var(--text);
  font-size: 10px;
  /* ★ 按钮文字紧凑时避免折行显示 */
  white-space: nowrap;
}

.saves-sync-btn:disabled {
  opacity: 0.45;
}

.saves-sync-btn.is-syncing {
  opacity: 0.45;
  transform: scale(0.94);
}

.saves-sync-btn.is-current {
  background: rgba(92, 125, 190, 0.36);
  /* color: #5276b5; */
  /* font-weight: 600; */
}

.saves-gist-children {
  display: grid;
  grid-template-rows: 1fr;
  margin: -2px 0 8px 28px;
  padding: 0;
  border-radius: 10px;
  background: transparent;
  overflow: hidden;
  /* ★ grid 容器自身允许收缩，避免内容撑破父级 */
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
}

.saves-gist-children-content {
  min-height: 0;
  min-width: 0;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.saves-children-enter-active,
.saves-children-leave-active {
  transition:
    grid-template-rows 0.28s cubic-bezier(0.22, 1, 0.36, 1),
    margin 0.28s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.2s ease-out;
}

.saves-children-enter-from,
.saves-children-leave-to {
  grid-template-rows: 0fr;
  margin-top: 0;
  margin-bottom: 0;
  opacity: 0;
}

.saves-children-enter-to,
.saves-children-leave-from {
  grid-template-rows: 1fr;
  opacity: 1;
}

.saves-gist-child {
  margin: 0;
}

.saves-gist-child-new {
  border: 0;
  border-radius: 15px;
  padding: 7px 12px;
  color: #5276b5;
  background: rgba(92, 125, 190, 0.1);
  font-size: 11px;
  text-align: left;
  margin-right: 13px;
}

/* ===== 自定义弹窗样式 ===== */
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  /* ★ 需高于宽屏文件列表面板(1001/1002)，避免弹窗被左侧列表覆盖 */
  z-index: 2001;
  padding: 0 8%;
}

.modal-mask.confirm-mask.has-position,
.modal-mask.prompt-mask.has-position {
  padding: 0;
  display: block;
}

.modal-box {
  width: 100%;
  max-width: 400px;
  min-height: 120px;
  background: #ffffffd2;
  /* color-mix(in srgb, var(--van-background-2, #d7d7d712) 78%, transparent); */
  -webkit-backdrop-filter: blur(18px) saturate(140%);
  backdrop-filter: blur(18px) saturate(140%);
  border: 0.1px solid rgba(255, 255, 255, 0.05);
  color: var(--text, #222);
  border-radius: 28px;
  padding: 1px 18px 10px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
}

.modal-box.confirm-box,
.modal-box.prompt-box {
  width: calc(100vw - 40px);
  width: calc(100dvw - 40px);
  max-width: 360px;
  box-sizing: border-box;
  animation: modalFadeIn 0.2s ease-out;
}

@keyframes modalFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* 窄屏幕 (如 iOS 手机端竖屏) 确保左右各有至少20px边距 */
@media (max-width: 480px) {
  .modal-box.confirm-box,
  .modal-box.prompt-box {
    width: calc(100vw - 40px) !important;
    width: calc(100dvw - 40px) !important;
    max-width: calc(100vw - 40px) !important;
    box-sizing: border-box !important;
  }
}

.modal-title {
  font-size: 17px;
  line-height: 1.4;
  text-align: center;
  margin: 34px 10px 18px 11px;
}

.modal-tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0 0 10px;
}

.modal-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 7px;
  border-radius: 10px;
  background: #8f98c61a;
  color: var(--text);
  font-size: 12px;
}

.modal-tag-remove {
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
}

.modal-input-label {
  display: block;
  margin: 0 0 5px 10px;
  font-size: 13px;
  font-weight: 600;
  opacity: 0.65;
}

.modal-input {
  width: 100%;
  box-sizing: border-box;
  font-size: 14px;
  padding: 8px 10px;
  border-radius: 14px;
  border: 0;
  /* 1px solid rgba(128, 128, 128, 0.1); */
  background: #00000023;
  color: inherit;
  outline: none;
  margin-bottom: 14px;
}

.modal-input:focus {
  border-color: #5c7dbe60;
}

.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 10px;
  margin-bottom: 6px;
}

.modal-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 14px;
  padding: 7px 18px;
  border-radius: 20px;
  border: 0;
  background: rgba(92, 125, 190, 0.12);
  color: inherit;
  
}

.modal-btn-primary {
  border-color: #5c7dbe;
  color: #5c7dbe;
  
}

/* ===== 可拖拽控制台面板 ===== */
.log-panel {
  position: fixed;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  background: #f6f6f632;
  border: 0.1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  box-shadow: 0 8px 26px #919db687;
  overflow: hidden;
  font-size: 13px;
  line-height: 1.5;
  color: #e0e0e0;
  min-width: 200px;
  min-height: 80px;
  touch-action: none;
  backdrop-filter: blur(20px) saturate(120%);
  -webkit-backdrop-filter: blur(20px) saturate(120%);
}
.log-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: rgba(232, 234, 236, 0.51);
  cursor: grab;
  color: #0000005c;
  user-select: none;
  flex-shrink: 0;
  touch-action: none;
  position: relative;
  backdrop-filter: blur(20px) saturate(120%);
  -webkit-backdrop-filter: blur(20px) saturate(120%);
}

@media (prefers-color-scheme: dark) {
  .modal-box {
    background: #9495a812;
  }
  .log-panel {
    background: #1c1e234c;
    border: 0.1px solid #282a31f7;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    color: #e0e0e0;
  }

  .saves-panel {
    box-shadow: 0px 10px 20px -10px #0000005c;
  }
  .log-header {
    background: rgba(37, 38, 43, 0.053);
    color: #ceddfb9b;
  }
}

.log-header:active {
  cursor: grabbing;
}

.log-title {
  font-weight: 600;
  font-size: 12px;
  opacity: 0.7;
  display: flex;
  align-items: center;
}
.log-title svg {
  cursor: grab;
}
.log-title svg:active {
  cursor: grabbing;
}
.log-btn {
  background: transparent;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: 12px;
  opacity: 0.6;
  height: 18px;
  padding: 0px 6px;
  border-radius: 4px;
}
.log-btn:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.1);
}
.log-time {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-size: 11px;
  opacity: 0.5;
  user-select: none;
  touch-action: none;
  white-space: nowrap;
}
.log-actions {
  margin-left: auto;
  display: flex;
  gap: 4px;
  align-items: center;
}
.log-run {
  color: #4caf50;
  opacity: 1;
  display: flex;
  align-items: center;
}
.log-close {
  font-size: 16px;
}
.log-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 6px 10px;
  -webkit-overflow-scrolling: touch;
}
.log-pre {
  padding: 2px;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: "SF Mono", "Fira Code", "Consolas", monospace;
  font-size: 12px;
  line-height: 1.6;
  cursor: pointer;
  background: transparent;
}
.log-resize-handle {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 20px;
  height: 20px;
  cursor: nwse-resize;
  font-size: 12px;
  line-height: 20px;
  text-align: center;
  opacity: 0.3;
  user-select: none;
  touch-action: none;
}
.log-resize-handle:hover {
  opacity: 0.8;
}
.saves-footers {
  justify-content: center;
  align-items: center;
  padding: 33px 10px;
  display: flex;
  gap: 16px;
}

/* 窄屏：隐藏宽度拖拽手柄（宽屏时在下方媒体查询中显示） */
.saves-vresize-handle {
  display: none;
}

/* ===== 宽屏（宽度 > 700px）：保存列表面板固定左侧，右侧为编辑器 ===== */
@media (min-width: 700px) {
  .edit-code-editor {
    width: auto !important;
    margin: -10px 2% 0 0 !important;
    transition: margin-left 0.2s ease;
  }
  /* ★ 面板打开时：标题固定在左侧面板顶部，形成「标题 | cmview / 文件列表 | cmview」分栏 */
  .edit-code-editor.saves-open {
    position: fixed;
    top: var(--nav-height, 0px);
    left: 0;
    width: var(--saves-width, 400px) !important;
    margin: 0 !important;
    padding: 20px 16px 22px 18px !important; /* 底部 22px 边距 */
    box-sizing: border-box;
    z-index: 1002;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .saves-panel {
    position: fixed;
    top: var(--nav-height, 0px);
    left: 0;
    bottom: 0;
    width: var(--saves-width, 400px);
    margin: 0;
    border-radius: 0;
    box-shadow: none;
    z-index: 1001;
  }

  .saves-panel-header {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    padding: 12px 16px;
    font-size: 16px;
    font-weight: 600;
    color: var(--text);
    opacity: 0.6;
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
  }

  .saves-body {
    height: auto !important; /* 覆盖内联拖拽高度 */
    flex: 1; /* 占满其余高度 */
    min-height: 0;
    margin-top: 62px; /* 标题栏高度（含 22px 底部边距），面板已从导航栏下方开始 */
    border-radius: 0;
  }

  .saves-resize-handle {
    display: none; /* 侧边栏固定全高，无需垂直拖拽手柄 */
  }

  /* .cmviewRef {
    margin: 0 2% 0 0;
    transition: margin-left 0.2s ease;
  }
  .cmviewRef.saves-open {
    margin-left: var(--saves-width, 400px);
  } */
  .cmviewRef {
    width: auto;
    max-width: none;
    min-width: 0;
    margin: 0 2% 0 0;
    box-sizing: border-box;
  }

  .cmviewRef.saves-open {
    width: auto !important;
    max-width: none !important;
    min-width: 0;
    margin-left: var(--saves-width, 400px);
    margin-right: 0;
    box-sizing: border-box;
  }
  /* 宽度拖拽手柄 + 1px 半透明分隔线 */
  .saves-vresize-handle {
    display: flex;
    align-items: center;
    justify-content: center;
    position: absolute;
    top: 0;
    bottom: 0;
    right: -7px;
    width: 14px;
    cursor: col-resize;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
    z-index: 5;
  }

  .saves-vresize-bar {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 1.5px;
    background: rgba(128, 128, 128, 0.12);
    transition: background 0.15s;
    pointer-events: none;
  }

  /* .saves-vresize-knob {
    position: relative;
    width: 18px;
    height: 34px;
    border-radius: 9px;
    background: rgba(128, 128, 128, 0.16);
    border: 0px solid rgba(128, 128, 128, 0.35);
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  } */

  /* .saves-vresize-dots {
    width: 8px;
    height: 84px;
    background: radial-gradient(circle, rgba(128, 128, 128, 0.742) 2px, transparent 2px);
    background-size: 84px 1px;
    background-position: center;
  } */

  .saves-vresize-handle:hover .saves-vresize-bar,
  .saves-vresize-handle:active .saves-vresize-bar {
    background: rgba(128, 128, 128, 0.55);
  }
}

/* ===== 回收站 / 已删除文件管理弹窗 ===== */
.modal-box.trash-box {
  width: calc(100vw - 32px);
  max-width: 500px;
  max-height: 82vh;
  display: flex;
  flex-direction: column;
  padding: 18px 20px 16px;
  box-sizing: border-box;
}

.trash-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.trash-title {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
}

.trash-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 999px;
  background: rgba(92, 125, 190, 0.18);
  color: #5c7dbe;
  font-weight: 600;
}

.trash-close-btn {
  border: 0;
  background: transparent;
  color: var(--text, #666);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 6px;
  opacity: 0.65;
  transition: opacity 0.2s;
}

.trash-close-btn:hover {
  opacity: 1;
}

.trash-close-btn:disabled {
  opacity: 0.25;
  cursor: not-allowed;
}

.trash-tip {
  font-size: 12px;
  opacity: 0.72;
  line-height: 1.45;
  margin-bottom: 10px;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(128, 128, 128, 0.06);
  border: 0.5px solid rgba(128, 128, 128, 0.12);
}

.trash-global-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(59, 130, 246, 0.1);
  border: 0.5px solid rgba(59, 130, 246, 0.25);
  font-size: 12px;
  color: #3b82f6;
  font-weight: 500;
}

.trash-list-scroll {
  flex: 1 1 auto;
  overflow-y: auto;
  min-height: 140px;
  max-height: 48vh;
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding-right: 4px;
}

.trash-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  opacity: 0.55;
}

.trash-empty-icon {
  font-size: 34px;
  margin-bottom: 8px;
}

.trash-empty-text {
  font-size: 13px;
}

.trash-item-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(128, 128, 128, 0.05);
  border: 0.5px solid rgba(128, 128, 128, 0.14);
  transition: all 0.2s ease;
}

.trash-item-row:hover {
  background: rgba(128, 128, 128, 0.09);
  border-color: rgba(128, 128, 128, 0.24);
  transform: translateY(-1px);
}

.trash-item-row.is-busy {
  border-color: rgba(59, 130, 246, 0.35);
  background: rgba(59, 130, 246, 0.04);
}

.trash-item-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1 1 auto;
}

.trash-item-name-line {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex-wrap: wrap;
}

.trash-item-name {
  font-size: 13px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 220px;
}

/* 回收站通用 Tag */
.trash-tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 10.5px;
  padding: 1.5px 6.5px;
  border-radius: 6px;
  font-weight: 500;
  line-height: 1.3;
  flex-shrink: 0;
}

.trash-tag.cloud {
  background: rgba(59, 130, 246, 0.12);
  color: #3b82f6;
  border: 0.5px solid rgba(59, 130, 246, 0.28);
}

.trash-tag.cloud .trash-tag-icon {
  width: 12px;
  height: 12px;
  object-fit: contain;
  flex-shrink: 0;
}

.trash-tag.gist {
  background: rgba(245, 158, 11, 0.14);
  color: #d97706;
  border: 0.5px solid rgba(245, 158, 11, 0.28);
}

.trash-tag.lang {
  background: rgba(100, 116, 139, 0.12);
  color: #64748b;
  border: 0.5px solid rgba(100, 116, 139, 0.2);
}

.trash-item-meta-line {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 11px;
  opacity: 0.65;
}

.trash-countdown.near-expired {
  color: #ef4444;
  font-weight: 500;
}

/* 行内操作进度提示条 */
.trash-row-progress {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 3px;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
  animation: fadeInRow 0.2s ease;
}

.trash-row-progress.delete {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border: 0.5px solid rgba(239, 68, 68, 0.22);
}

.trash-row-progress.restore {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  border: 0.5px solid rgba(59, 130, 246, 0.22);
}

.trash-inline-spinner {
  width: 11px;
  height: 11px;
  border: 1.5px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spinTrash 0.75s linear infinite;
  display: inline-block;
  flex-shrink: 0;
}

@keyframes spinTrash {
  to {
    transform: rotate(360deg);
  }
}

@keyframes fadeInRow {
  from {
    opacity: 0;
    transform: translateY(-2px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.trash-item-actions {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-shrink: 0;
}

@media (max-width: 520px) {
  .trash-item-actions {
    flex-direction: column;
    align-items: stretch;
    gap: 5px;
  }

  .trash-item-actions .trash-btn {
    justify-content: center;
    padding: 4px 8px;
    font-size: 11.5px;
    white-space: nowrap;
  }
}

.trash-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 0;
  border-radius: 8px;
  padding: 5px 11px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.18s ease;
}

.trash-btn-restore {
  background: rgba(59, 130, 246, 0.12);
  color: #3b82f6;
  border: 0.5px solid rgba(59, 130, 246, 0.22);
}

.trash-btn-restore:hover:not(:disabled) {
  background: rgba(59, 130, 246, 0.24);
  transform: translateY(-1px);
}

.trash-btn-delete {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border: 0.5px solid rgba(239, 68, 68, 0.2);
}

.trash-btn-delete:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.22);
  transform: translateY(-1px);
}

.trash-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  transform: none !important;
}

.trash-footer-actions {
  margin-top: 14px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.trash-btn-batch-restore {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 6px;
}

.trash-btn-batch-clear {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 6px;
  background: rgba(239, 68, 68, 0.15) !important;
  color: #ef4444 !important;
  border: 0.5px solid rgba(239, 68, 68, 0.3) !important;
}

.trash-btn-batch-clear:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.26) !important;
}

/* ===== 同步确认与进度展示弹窗样式 ===== */
.sync-mask {
  z-index: 2000;
}

.modal-box.sync-box {
  width: min(92vw, 480px);
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  padding: 18px 20px;
}

.sync-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.sync-title-line {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sync-title {
  font-size: 16px;
  font-weight: 600;
}

.sync-count-tag {
  font-size: 11px;
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(92, 125, 190, 0.15);
  color: #5c7dbe;
  font-weight: 600;
}

.sync-close-btn {
  background: transparent;
  border: none;
  font-size: 16px;
  cursor: pointer;
  opacity: 0.6;
  padding: 4px;
  border-radius: 6px;
  line-height: 1;
  color: inherit;
}

.sync-tab-nav {
  display: flex;
  background: rgba(128, 128, 128, 0.08);
  border-radius: 8px;
  padding: 3px;
  margin-bottom: 12px;
  gap: 4px;
}

.sync-tab-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 500;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  opacity: 0.72;
  cursor: pointer;
  transition: all 0.18s ease;
}

.sync-tab-btn:hover:not(:disabled) {
  opacity: 0.95;
}

.sync-tab-btn.active {
  background: var(--bg-card, #ffffff);
  color: var(--primary, #5c7dbe);
  opacity: 1;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  font-weight: 600;
}

.sync-tab-btn:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.sync-tab-badge {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 999px;
  background: #ff5252;
  color: #ffffff;
  font-weight: 600;
  line-height: 1.3;
}

.sync-close-btn:hover {
  opacity: 1;
  background: rgba(128, 128, 128, 0.15);
}

.sync-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  flex: 1 1 auto;
}

.sync-tip {
  font-size: 12px;
  opacity: 0.75;
  line-height: 1.5;
}

.sync-tip-success {
  color: #28a745;
  font-weight: 500;
}

.sync-item-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 48vh;
  overflow-y: auto;
  padding-right: 4px;
}

.sync-item-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 10px;
  background: rgba(128, 128, 128, 0.08);
  border: 0.5px solid rgba(128, 128, 128, 0.15);
  transition: all 0.2s ease;
}

.sync-item-row.status-uploading,
.sync-item-row.status-downloading {
  background: rgba(92, 125, 190, 0.1);
  border-color: rgba(92, 125, 190, 0.35);
}

.sync-item-row.status-success {
  background: rgba(40, 167, 69, 0.08);
  border-color: rgba(40, 167, 69, 0.25);
}

.sync-item-row.status-error {
  background: rgba(220, 53, 69, 0.08);
  border-color: rgba(220, 53, 69, 0.25);
}

.sync-item-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  flex: 1 1 auto;
}

.sync-item-top {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.sync-item-name {
  font-size: 13px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sync-item-type-badge {
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(128, 128, 128, 0.15);
  flex-shrink: 0;
}

.sync-item-type-badge.新增 {
  background: rgba(40, 167, 69, 0.15);
  color: #28a745;
}

.sync-item-type-badge.更新 {
  background: rgba(92, 125, 190, 0.15);
  color: #5c7dbe;
}

.sync-item-type-badge.回收站 {
  background: rgba(240, 140, 0, 0.15);
  color: #e67700;
}

.sync-item-type-badge.配置,
.sync-item-type-badge.列表,
.sync-item-type-badge.状态 {
  background: rgba(111, 66, 193, 0.15);
  color: #6f42c1;
}

.sync-item-reason {
  font-size: 11px;
  opacity: 0.6;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sync-item-status {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 6px;
  font-weight: 500;
}

.status-badge.pending {
  background: rgba(128, 128, 128, 0.12);
  opacity: 0.7;
}

.status-badge.progress {
  background: rgba(92, 125, 190, 0.18);
  color: #3b82f6;
  animation: pulseProgress 1.5s infinite;
}

.status-badge.success {
  background: rgba(40, 167, 69, 0.15);
  color: #28a745;
  font-weight: 600;
}

.status-badge.error {
  background: rgba(220, 53, 69, 0.15);
  color: #dc3545;
  cursor: help;
}

@keyframes pulseProgress {
  0% { opacity: 0.8; }
  50% { opacity: 1; }
  100% { opacity: 0.8; }
}

.sync-spinner {
  display: inline-block;
  width: 10px;
  height: 10px;
  border: 1.5px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: syncSpin 0.75s linear infinite;
}

.sync-spinner.white {
  border-color: #ffffff;
  border-right-color: transparent;
}

@keyframes syncSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.sync-footer {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.sync-btn {
  padding: 7px 16px;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  border: none;
  font-weight: 500;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.sync-btn.cancel {
  background: rgba(128, 128, 128, 0.12);
  color: inherit;
}

.sync-btn.cancel:hover {
  background: rgba(128, 128, 128, 0.2);
}

.sync-btn.confirm {
  background: #5c7dbe;
  color: #ffffff;
}

.sync-btn.confirm:hover:not(:disabled) {
  background: #4a6aa7;
}

.sync-btn.confirm:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.sync-loading-box,
.sync-empty-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 42px 16px;
  gap: 12px;
  opacity: 0.85;
}

.sync-spinner.large {
  width: 28px;
  height: 28px;
  border-width: 2.5px;
  color: #5c7dbe;
}

.sync-loading-text {
  font-size: 13px;
  opacity: 0.75;
}

.sync-empty-icon {
  font-size: 32px;
  color: #28a745;
  line-height: 1;
}

.sync-empty-text {
  font-size: 13px;
  font-weight: 500;
  opacity: 0.8;
}
</style>
