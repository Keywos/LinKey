<template>
  <div v-if="show" class="shortcut-overlay" @click.self="show = false">
    <section class="shortcut-panel" role="dialog" aria-modal="true" :aria-label="panelTitle">
      <div class="shortcut-panel__header">
        <strong style="padding-left: 4px">{{ panelTitle }}</strong>
        <button style="padding-right: 4px" type="button" aria-label="关闭" @click="show = false">
          <van-icon name="cross" />
        </button>
      </div>

      <div v-if="isBuiltInShortcut && !isSpecialShortcut" class="shortcut-panel__builtin">
        <div>
          <strong>{{ shortcutName }}</strong>
          <!-- <span>首页内置图标</span> -->
        </div>
        <van-switch v-model="shortcutEnabled" size="22px" />
      </div>

      <label v-if="!isSpecialShortcut" class="shortcut-panel__control">
        <span>
          <span style="padding-left: 4px">名称{{ isBuiltInShortcut ? " (只读)" : "" }}</span>
        </span>
        <input v-model.trim="shortcutName" type="text" placeholder="例如：Bing" :readonly="isBuiltInShortcut" :tabindex="isBuiltInShortcut ? -1 : 0" @mousedown="onReadonlyMousedown" />
      </label>

      <label v-if="!isSpecialShortcut" class="shortcut-panel__control">
        <span>
          <span style="padding-left: 4px">跳转地址{{ isBuiltInShortcut ? " (只读)" : "" }}</span>
        </span>
        <input
          v-model.trim="shortcutUrl"
          type="text"
          placeholder="https://bing.com/ 或 /search"
          :readonly="isBuiltInShortcut"
          :tabindex="isBuiltInShortcut ? -1 : 0"
          @mousedown="onReadonlyMousedown"
        />
      </label>

      <div class="shortcut-panel__control">
        <span>
          <span style="padding-left: 4px">图标</span>
        </span>
        <div class="shortcut-panel__segmented">
          <button v-for="option in iconTypeOptions" :key="option.value" type="button" :class="{ 'is-active': shortcutIconType === option.value }" @click="selectIconType(option.value)">
            {{ option.label }}
          </button>
        </div>
      </div>

      <label v-if="shortcutIconType === 'emoji'" class="shortcut-panel__control">
        <span>
          <span>Emoji</span>
        </span>
        <input v-model.trim="shortcutIcon" type="text" placeholder="例如：🔎" />
      </label>

      <template v-else-if="shortcutIconType === 'url'">
        <label class="shortcut-panel__control">
          <span>
            <span>图标网址</span>
          </span>
          <input v-model.trim="shortcutIcon" type="url" placeholder="https://example.com/icon.png" />
        </label>
        <label class="shortcut-panel__control shortcut-panel__range">
          <span>
            <span>图标大小</span>
            <b>{{ selectedIconSize }}px</b>
          </span>
          <div style="height: 12px" />
          <van-slider v-model="selectedIconSize" bar-height="20px" :step="1" :min="18" :max="66" />
          <!-- <input v-model.number="selectedIconSize" type="range" min="18" max="66" step="1" /> -->
        </label>
      </template>

      <button v-else type="button" class="shortcut-panel__picker" @click="showBuiltInIconPicker = true">
        <img v-if="isCurrentBuiltInIcon" :src="shortcutIcon" :alt="shortcutBuiltInIcon" class="shortcut-panel__picker-icon" />
        <span>内置图标</span>
        <b>{{ shortcutBuiltInIcon || "选择图标" }}</b>
      </button>

      <div class="shortcut-panel__actions">
        <button type="button" class="shortcut-panel__btn shortcut-panel__btn--ghost" @click="show = false">取消</button>
        <button v-if="editingShortcut && !isBuiltInShortcut && !isSpecialShortcut" type="button" class="shortcut-panel__btn shortcut-panel__btn--danger" @click="deleteShortcut">删除</button>
        <button type="button" class="shortcut-panel__btn shortcut-panel__btn--primary" @click="saveShortcut">
          {{ isSpecialShortcut ? "保存" : editingShortcut ? "保存" : "添加" }}
        </button>
      </div>
    </section>
  </div>

  <van-popup v-model:show="showIconSizePicker" round position="bottom" :lock-scroll="false">
    <van-picker :columns="iconSizeOptions" @cancel="showIconSizePicker = false" @confirm="onIconSizeConfirm" />
  </van-popup>

  <div v-if="showBuiltInIconPicker" class="icon-picker-overlay" @click.self="showBuiltInIconPicker = false">
    <section class="icon-picker" role="dialog" aria-modal="true" aria-label="选择内置图标">
      <div class="icon-picker__header">
        <strong>&nbsp;选择内置图标</strong>
        <button style="padding-right: 4px" type="button" aria-label="关闭" @click="showBuiltInIconPicker = false">
          <van-icon name="cross" />
        </button>
      </div>
      <div class="icon-picker__grid">
        <button
          v-for="option in builtInIconOptions"
          :key="option.value"
          type="button"
          class="icon-picker__item"
          :class="{ 'is-active': shortcutIcon === option.value }"
          @click="onBuiltInIconConfirm(option)"
        >
          <img :src="option.value" :alt="option.text" />
          <span>{{ option.text }}</span>
          <van-icon v-if="shortcutIcon === option.value" name="success" class="icon-picker__check" />
        </button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { showToast } from "vant";
import { getHomeCards, saveHomeCards } from "@/homeCards.js";
import ts from "@/img/svg/ts.svg";
import success from "@/img/svg/success.svg";
import carry from "@/img/svg/carry.svg";
import cny from "@/img/svg/cny.svg";
import sf from "@/img/svg/sf.svg";
import safa from "@/img/svg/safa.svg";
import hgithub from "@/img/svg/hgithub.svg";
import w from "@/img/svg/w.svg";
import editIcon from "@/img/svg/edit.svg";
import moreIcon from "@/img/svg/more.svg";
import yjurlIcon from "@/img/svg/yjurl.svg";

const props = defineProps({
  show: { type: Boolean, default: false },
  card: { type: Object, default: null },
});
const emit = defineEmits(["update:show", "saved"]);

const show = ref(props.show);
const iconTypeOptions = [
  { label: "Emoji", value: "emoji" },
  { label: "网址", value: "url" },
  { label: "内置", value: "builtin" },
];
watch(
  () => props.show,
  (value) => {
    show.value = value;
    if (value) {
      if (props.card) {
        editingShortcut.value = props.card;
        shortcutName.value = props.card.id;
        shortcutUrl.value = props.card.r;
        shortcutIcon.value = props.card.img;
        const builtInIcon = builtInIconOptions.find((option) => option.value === props.card.img);
        shortcutIconType.value = builtInIcon ? "builtin" : /^https?:\/\//.test(props.card.img) ? "url" : "emoji";
        shortcutBuiltInIcon.value = builtInIcon?.text || "";
        selectedIconSize.value = props.card.iconSize || 20;
        shortcutIconSize.value = iconSizeOptions.find((option) => option.value === selectedIconSize.value)?.text || "默认（20px）";
        shortcutEnabled.value = props.card.enabled !== false;
      } else {
        resetShortcutForm();
      }
    }
  },
);
watch(show, (value) => emit("update:show", value));

const shortcutName = ref("");
const shortcutUrl = ref("");
const shortcutIconType = ref("emoji");
const shortcutIcon = ref("");
const editingShortcut = ref(null);
const shortcutIconSize = ref("默认（20px）");
const showIconSizePicker = ref(false);
const showBuiltInIconPicker = ref(false);
const iconSizeOptions = [
  { text: "小（24px）", value: 24 },
  { text: "默认（34px）", value: 34 },
  { text: "大（66px）", value: 66 },
];
const builtInIconOptions = [
  { text: "编辑", value: editIcon },
  { text: "更多", value: moreIcon },
  { text: "添加", value: yjurlIcon },
  { text: "Time", value: ts },
  { text: "Success", value: success },
  { text: "Ping", value: carry },
  { text: "CNY", value: cny },
  { text: "SF", value: sf },
  { text: "Search", value: safa },
  { text: "GitHub", value: hgithub },
  { text: "Code", value: w },
];
const selectedIconSize = ref(20);
const shortcutEnabled = ref(true);
const isBuiltInShortcut = computed(() => Boolean(editingShortcut.value?.builtIn));
const isSpecialShortcut = computed(() => Boolean(editingShortcut.value?.special));
const panelTitle = computed(() => {
  if (isSpecialShortcut.value) return "自定义图标";
  return editingShortcut.value ? "编辑快捷方式" : "添加快捷方式";
});
const shortcutBuiltInIcon = ref("");
const isCurrentBuiltInIcon = computed(() => shortcutIconType.value === "builtin" && builtInIconOptions.some((option) => option.value === shortcutIcon.value));
const selectIconType = (type) => {
  shortcutIconType.value = type;
  if (type === "builtin" && !isCurrentBuiltInIcon.value) {
    shortcutIcon.value = "";
    shortcutBuiltInIcon.value = "";
  }
};
const onIconSizeConfirm = ({ selectedOptions }) => {
  const option = selectedOptions[0];
  if (option) {
    selectedIconSize.value = option.value;
    shortcutIconSize.value = option.text;
  }
  showIconSizePicker.value = false;
};
const onBuiltInIconConfirm = (option) => {
  shortcutIcon.value = option.value;
  shortcutBuiltInIcon.value = option.text;
  showBuiltInIconPicker.value = false;
};
const resetShortcutForm = () => {
  editingShortcut.value = null;
  shortcutName.value = "";
  shortcutUrl.value = "";
  shortcutIconType.value = "emoji";
  shortcutIcon.value = "";
  shortcutBuiltInIcon.value = "";
  selectedIconSize.value = 20;
  shortcutIconSize.value = "默认（20px）";
  shortcutEnabled.value = true;
};
const addShortcut = () => {
  try {
    if (isSpecialShortcut.value) {
      if (!shortcutIcon.value) {
        throw new Error("请选择图标");
      }
      if (shortcutIconType.value === "url" && !["http:", "https:"].includes(new URL(shortcutIcon.value).protocol)) {
        throw new Error("请填写有效的图标网址");
      }
      const specialIcons = JSON.parse(localStorage.getItem("HomeSpecialIcons") || "{}");
      specialIcons[editingShortcut.value.id] = {
        img: shortcutIcon.value,
        ...(shortcutIconType.value === "url" ? { iconSize: selectedIconSize.value } : {}),
      };
      localStorage.setItem("HomeSpecialIcons", JSON.stringify(specialIcons));
      show.value = false;
      const savedId = editingShortcut.value.id;
      resetShortcutForm();
      showToast("图标已保存");
      emit("saved", { id: savedId, special: true });
      return;
    }
    if (!shortcutName.value || !shortcutUrl.value || !shortcutIcon.value) {
      throw new Error("请填写名称、跳转地址和图标");
    }
    if (shortcutIconType.value === "url" && !["http:", "https:"].includes(new URL(shortcutIcon.value).protocol)) {
      throw new Error("请填写有效的图标网址");
    }
    const homeCards = getHomeCards();
    if (homeCards.some((card) => card.id === shortcutName.value && card.id !== editingShortcut.value?.id)) {
      throw new Error("快捷方式名称已存在");
    }
    const shortcut = {
      id: shortcutName.value,
      img: shortcutIcon.value,
      r: shortcutUrl.value,
      enabled: isBuiltInShortcut.value ? shortcutEnabled.value : (editingShortcut.value?.enabled ?? true),
      ...(shortcutIconType.value === "url" ? { iconSize: selectedIconSize.value } : {}),
    };
    const isEditing = Boolean(editingShortcut.value);
    if (isEditing) {
      const storedCard = homeCards.find((card) => card.id === editingShortcut.value.id);
      if (storedCard) {
        Object.assign(storedCard, shortcut);
        if (isBuiltInShortcut.value) storedCard.builtIn = true;
      }
      saveHomeCards(homeCards);
    } else {
      homeCards.push(shortcut);
      saveHomeCards(homeCards);
    }
    show.value = false;
    const savedBuiltIn = isBuiltInShortcut.value;
    resetShortcutForm();
    showToast(savedBuiltIn ? "图标已保存" : isEditing ? "快捷方式已保存" : "快捷方式已添加");
    emit("saved", shortcut);
  } catch (error) {
    showToast(error.message);
  }
};
const saveShortcut = () => addShortcut();
const onReadonlyMousedown = (event) => {
  if (isBuiltInShortcut.value) event.preventDefault();
};
const deleteShortcut = () => {
  try {
    const homeCards = getHomeCards();
    const index = homeCards.findIndex((card) => card.id === editingShortcut.value?.id);
    if (index === -1) {
      throw new Error("快捷方式不存在");
    }
    homeCards.splice(index, 1);
    saveHomeCards(homeCards);
    show.value = false;
    const deletedId = editingShortcut.value.id;
    resetShortcutForm();
    showToast("快捷方式已删除");
    emit("saved", { id: deletedId, deleted: true });
  } catch (error) {
    showToast(error.message);
  }
};
</script>

<style scoped>
.shortcut-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(25, 31, 48, 0.12);
}

.shortcut-panel {
  width: min(360px, 100%);
  padding: 18px;
  border: 1px solid rgba(255, 255, 255, 0.42);
  border-radius: 29px;
  color: inherit;
  background: rgba(255, 255, 255, 0.58);
  box-shadow: 0 18px 55px rgba(62, 77, 126, 0.22);
  backdrop-filter: blur(24px) saturate(1.35);
  -webkit-backdrop-filter: blur(24px) saturate(1.35);
}

.shortcut-panel__header,
.shortcut-panel__control > span {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.shortcut-panel__header {
  margin-bottom: 18px;
  font-size: 16px;
}

.shortcut-panel__header button {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  color: inherit;
  background: rgba(255, 255, 255, 0.38);
}

.shortcut-panel__control {
  display: block;
  margin-top: 18px;
  font-size: 13px;
}

.shortcut-panel__control input {
  display: block;
  width: 100%;
  margin-top: 10px;
  padding: 10px 12px;
  box-sizing: border-box;
  border: 1px solid rgba(100, 110, 140, 0.18);
  border-radius: 22px;
  color: inherit;
  background: rgba(255, 255, 255, 0.5);
  font: inherit;
  font-size: 14px;
  outline: none;
}

.shortcut-panel__control input::placeholder {
  color: rgba(100, 110, 140, 0.55);
}

.shortcut-panel__control input:focus {
  border-color: rgba(113, 135, 220, 0.6);
}

.shortcut-panel__control input[readonly] {
  cursor: default;
  opacity: 0.72;
  user-select: none;
  -webkit-user-select: none;
}

.shortcut-panel__builtin {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 12px 0 22px;
  padding: 9px 14px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.36);
}

.shortcut-panel__builtin div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.shortcut-panel__builtin span {
  font-size: 12px;
  opacity: 0.55;
}

.shortcut-panel__range input[type="range"] {
  padding: 0;
  border: 0;
  accent-color: #7187dc;
  background: transparent;
}

.shortcut-panel__segmented {
  display: flex;
  gap: 6px;
  margin-top: 10px;
  padding: 4px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.42);
}

.shortcut-panel__segmented button {
  flex: 1;
  padding: 8px 0;
  border: 0;
  border-radius: 22px;
  color: inherit;
  background: transparent;
  font: inherit;
  font-size: 13px;
  opacity: 0.65;
}

.shortcut-panel__segmented button.is-active {
  color: #fff;
  background: linear-gradient(145deg, #6e95ff, #8a6dff);
  box-shadow: 0 4px 12px rgba(110, 149, 255, 0.35);
  opacity: 1;
}

.shortcut-panel__picker {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  margin-top: 18px;
  padding: 10px 13px;
  box-sizing: border-box;
  border: 1px solid rgba(100, 110, 140, 0.18);
  border-radius: 22px;
  color: inherit;
  background: rgba(255, 255, 255, 0.5);
  font: inherit;
  font-size: 13px;
}

.shortcut-panel__picker b {
  font-size: 14px;
  font-weight: 600;
}

.shortcut-panel__picker-icon {
  width: 22px;
  height: 22px;
  margin-right: 8px;
  object-fit: contain;
}

.shortcut-panel__actions {
  display: flex;
  gap: 12px;
  margin-top: 22px;
  padding-top: 14px;
  border-top: 1px solid rgba(100, 110, 140, 0.16);
}

.shortcut-panel__btn {
  flex: 1;
  padding: 11px 0;
  border: 0;
  border-radius: 999px;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
}

.shortcut-panel__btn--ghost {
  color: inherit;
  background: rgba(255, 255, 255, 0.38);
}

.shortcut-panel__btn--primary {
  color: #fff;
  background: linear-gradient(145deg, #6e95ff, #8a6dff);
  box-shadow: 0 6px 16px rgba(110, 149, 255, 0.35);
}

.shortcut-panel__btn--danger {
  color: #fff;
  background: linear-gradient(145deg, #ff7a7a, #ff5f6d);
  box-shadow: 0 6px 16px rgba(255, 95, 109, 0.35);
}

.icon-picker-overlay {
  position: fixed;
  inset: 0;
  z-index: 2100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(25, 31, 48, 0.32);
}

.icon-picker {
  width: min(420px, 100%);
  max-height: 72vh;
  padding: 18px 18px 26px;
  box-sizing: border-box;
  border: 1px solid rgba(255, 255, 255, 0.42);
  border-radius: 24px;
  color: inherit;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 18px 55px rgba(62, 77, 126, 0.22);
  backdrop-filter: blur(24px) saturate(1.35);
  -webkit-backdrop-filter: blur(24px) saturate(1.35);
}

.icon-picker__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  font-size: 16px;
}

.icon-picker__header button {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  color: inherit;
  background: rgba(255, 255, 255, 0.38);
}

.icon-picker__grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  max-height: calc(72vh - 90px);
  overflow-y: auto;
}

.icon-picker__item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 14px 6px 12px;
  border: 1px solid rgba(100, 110, 140, 0.16);
  border-radius: 22px;
  color: inherit;
  background: rgba(255, 255, 255, 0.5);
  font: inherit;
  cursor: pointer;
}

.icon-picker__item img {
  width: 34px;
  height: 34px;
  object-fit: contain;
}

.icon-picker__item span {
  font-size: 12px;
  opacity: 0.65;
}

.icon-picker__item.is-active {
  border-color: rgba(110, 149, 255, 0.7);
  background: rgba(110, 149, 255, 0.14);
  box-shadow: 0 4px 14px rgba(110, 149, 255, 0.22);
}

.icon-picker__item.is-active span {
  color: #5b7cf0;
  font-weight: 600;
  opacity: 1;
}

.icon-picker__check {
  position: absolute;
  top: 6px;
  right: 6px;
  color: #5b7cf0;
  font-size: 16px;
}

@media (prefers-color-scheme: dark) {
  .shortcut-overlay {
    background: rgba(0, 0, 0, 0.22);
  }

  .shortcut-panel {
    border-color: rgba(255, 255, 255, 0.12);
    background: rgba(35, 39, 48, 0.78);
    box-shadow: 0 18px 55px rgba(0, 0, 0, 0.32);
  }

  .shortcut-panel__header button {
    border-color: rgba(255, 255, 255, 0.12);
    background: rgba(45, 49, 58, 0.72);
  }

  .shortcut-panel__control input,
  .shortcut-panel__picker,
  .shortcut-panel__builtin {
    border-color: rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.06);
  }

  .shortcut-panel__control input::placeholder {
    color: rgba(200, 208, 230, 0.4);
  }

  .shortcut-panel__segmented {
    background: rgba(255, 255, 255, 0.06);
  }

  .shortcut-panel__btn--ghost {
    background: rgba(255, 255, 255, 0.1);
  }

  .icon-picker-overlay {
    background: rgba(0, 0, 0, 0.32);
  }

  .icon-picker {
    border-color: rgba(255, 255, 255, 0.12);
    background: rgba(35, 39, 48, 0.92);
    box-shadow: 0 18px 55px rgba(0, 0, 0, 0.32);
  }

  .icon-picker__header button {
    background: rgba(45, 49, 58, 0.72);
  }

  .icon-picker__item {
    border-color: rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.06);
  }

  .icon-picker__item.is-active {
    border-color: rgba(110, 149, 255, 0.7);
    background: rgba(110, 149, 255, 0.18);
  }
}
</style>
