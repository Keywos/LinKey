<template>
  <div v-if="show" class="shortcut-overlay" @click.self="show = false">
    <section class="shortcut-panel" role="dialog" aria-modal="true" :aria-label="editingShortcut ? '编辑快捷方式' : '添加快捷方式'">
      <div class="shortcut-panel__header">
        <strong>{{ editingShortcut ? "编辑快捷方式" : "添加快捷方式" }}</strong>
        <button type="button" aria-label="关闭" @click="show = false">
          <van-icon name="cross" />
        </button>
      </div>

      <label class="shortcut-panel__control">
        <span>
          <span>名称</span>
        </span>
        <input v-model.trim="shortcutName" type="text" placeholder="例如：Bing" />
      </label>

      <label class="shortcut-panel__control">
        <span>
          <span>跳转地址</span>
        </span>
        <input v-model.trim="shortcutUrl" type="text" placeholder="https://bing.com/ 或 /search" />
      </label>

      <div class="shortcut-panel__control">
        <span>
          <span>图标</span>
        </span>
        <div class="shortcut-panel__segmented">
          <button
            v-for="option in iconTypeOptions"
            :key="option.value"
            type="button"
            :class="{ 'is-active': shortcutIconType === option.value }"
            @click="shortcutIconType = option.value"
          >
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
        <button type="button" class="shortcut-panel__picker" @click="showIconSizePicker = true">
          <span>图标大小</span>
          <b>{{ shortcutIconSize }}</b>
        </button>
      </template>

      <button v-else type="button" class="shortcut-panel__picker" @click="showBuiltInIconPicker = true">
        <span>内置图标</span>
        <b>{{ shortcutBuiltInIcon || "选择图标" }}</b>
      </button>

      <div class="shortcut-panel__actions">
        <button type="button" class="shortcut-panel__btn shortcut-panel__btn--ghost" @click="show = false">取消</button>
        <button type="button" class="shortcut-panel__btn shortcut-panel__btn--primary" @click="saveShortcut">
          {{ editingShortcut ? "保存" : "添加" }}
        </button>
      </div>
    </section>
  </div>

  <van-popup v-model:show="showIconSizePicker" round position="bottom" :lock-scroll="false">
    <van-picker :columns="iconSizeOptions" @cancel="showIconSizePicker = false" @confirm="onIconSizeConfirm" />
  </van-popup>

  <van-popup v-model:show="showBuiltInIconPicker" round position="bottom" :lock-scroll="false">
    <van-picker :columns="builtInIconOptions" @cancel="showBuiltInIconPicker = false" @confirm="onBuiltInIconConfirm" />
  </van-popup>
</template>

<script setup>
import { ref, watch } from "vue";
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
      } else {
        resetShortcutForm();
      }
    }
  }
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
  { text: "大（45px）", value: 45 },
];
const builtInIconOptions = [
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
const shortcutBuiltInIcon = ref("");
const onIconSizeConfirm = ({ selectedOptions }) => {
  const option = selectedOptions[0];
  if (option) {
    selectedIconSize.value = option.value;
    shortcutIconSize.value = option.text;
  }
  showIconSizePicker.value = false;
};
const onBuiltInIconConfirm = ({ selectedOptions }) => {
  const option = selectedOptions[0];
  if (option) {
    shortcutIcon.value = option.value;
    shortcutBuiltInIcon.value = option.text;
  }
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
};
const addShortcut = () => {
  try {
    if (!shortcutName.value || !shortcutUrl.value || !shortcutIcon.value) {
      throw new Error("请填写名称、跳转地址和图标");
    }
    if (shortcutIconType.value === "url" && !["http:", "https:"].includes(new URL(shortcutIcon.value).protocol)) {
      throw new Error("请填写有效的图标网址");
    }
    const homeCards = getHomeCards();
    if (homeCards.some((card) => card !== editingShortcut.value && card.id === shortcutName.value)) {
      throw new Error("快捷方式名称已存在");
    }
    const shortcut = {
      id: shortcutName.value,
      img: shortcutIcon.value,
      r: shortcutUrl.value,
      enabled: editingShortcut.value?.enabled ?? true,
      ...(shortcutIconType.value === "url" ? { iconSize: selectedIconSize.value } : {}),
    };
    const isEditing = Boolean(editingShortcut.value);
    if (isEditing) {
      Object.assign(editingShortcut.value, shortcut);
      saveHomeCards(homeCards);
    } else {
      homeCards.push(shortcut);
      saveHomeCards(homeCards);
    }
    show.value = false;
    resetShortcutForm();
    showToast(isEditing ? "快捷方式已保存" : "快捷方式已添加");
    emit("saved", shortcut);
  } catch (error) {
    showToast(error.message);
  }
};
const saveShortcut = () => addShortcut();
</script>

<style scoped>
.shortcut-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 92px 18px 24px;
  background: rgba(25, 31, 48, 0.12);
}

.shortcut-panel {
  width: min(360px, 100%);
  padding: 18px;
  border: 1px solid rgba(255, 255, 255, 0.42);
  border-radius: 24px;
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
  border-radius: 12px;
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

.shortcut-panel__segmented {
  display: flex;
  gap: 6px;
  margin-top: 10px;
  padding: 4px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.42);
}

.shortcut-panel__segmented button {
  flex: 1;
  padding: 8px 0;
  border: 0;
  border-radius: 9px;
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
  padding: 12px;
  box-sizing: border-box;
  border: 1px solid rgba(100, 110, 140, 0.18);
  border-radius: 12px;
  color: inherit;
  background: rgba(255, 255, 255, 0.5);
  font: inherit;
  font-size: 13px;
}

.shortcut-panel__picker b {
  font-size: 14px;
  font-weight: 600;
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
  .shortcut-panel__picker {
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
}
</style>