// js/UIManager.js
export class UIManager {
    constructor() {
        this.elements = {};
        this.callbacks = {};
        
        // DOM要素を取得
        this.initElements();
        
        // イベント設定
        this.setupEvents();
    }
    
    // DOM要素初期化
    initElements() {
        this.elements = {
            // ボタン
            vrButton: document.getElementById('vrButton'),
            resetButton: document.getElementById('resetButton'),
            clearButton: document.getElementById('clearButton'),
            saveButton: document.getElementById('saveButton'),
            loadButton: document.getElementById('loadButton'),
            voiceButton: document.getElementById('voiceButton'),
            
            // 入力
            fileInput: document.getElementById('fileInput'),
            scaleSlider: document.getElementById('scaleSlider'),
            memoTextarea: document.getElementById('memoTextarea'),
            
            // パネル・ダイアログ
            info: document.getElementById('info'),
            memoPanel: document.getElementById('memoPanel'),
            memoList: document.getElementById('memoList'),
            inputMethodDialog: document.getElementById('inputMethodDialog'),
            memoInputDialog: document.getElementById('memoInputDialog'),
            loading: document.getElementById('loading'),
            status: document.getElementById('status'),
            memoModeIndicator: document.getElementById('memoModeIndicator'),
            
            // スケールボタン
            scale05: document.getElementById('scale05'),
            scale1: document.getElementById('scale1'),
            scale2: document.getElementById('scale2'),
            scale5: document.getElementById('scale5'),
            scaleValue: document.getElementById('scaleValue'),
            
            // メソッド選択
            voiceInputBtn: document.getElementById('voiceInputBtn'),
            keyboardInputBtn: document.getElementById('keyboardInputBtn'),
            submitMemoBtn: document.getElementById('submitMemoBtn'),
            cancelMemoBtn: document.getElementById('cancelMemoBtn')
        };
    }
    
    // イベント設定
    setupEvents() {
        // VRボタン
        if(this.elements.vrButton) {
            this.elements.vrButton.addEventListener('click', () => {
                if(this.callbacks.onVRStart) {
                    this.callbacks.onVRStart();
                }
            });
        }
        
        // リセットボタン
        if(this.elements.resetButton) {
            this.elements.resetButton.addEventListener('click', () => {
                if(this.callbacks.onReset) {
                    this.callbacks.onReset();
                }
            });
        }
        
        // クリアボタン
        if(this.elements.clearButton) {
            this.elements.clearButton.addEventListener('click', () => {
                if(this.callbacks.onClear) {
                    this.callbacks.onClear();
                }
            });
        }
        
        // セーブボタン
        if(this.elements.saveButton) {
            this.elements.saveButton.addEventListener('click', () => {
                if(this.callbacks.onSave) {
                    this.callbacks.onSave();
                }
            });
        }
        
        // ロードボタン
        if(this.elements.loadButton) {
            this.elements.loadButton.addEventListener('click', () => {
                if(this.callbacks.onLoad) {
                    this.callbacks.onLoad();
                }
            });
        }
        
        // ファイル入力
        if(this.elements.fileInput) {
            this.elements.fileInput.addEventListener('change', (e) => {
                if(this.callbacks.onFileSelect) {
                    this.callbacks.onFileSelect(e.target.files[0]);
                }
            });
        }
        
        // スケールスライダー
        if(this.elements.scaleSlider) {
            this.elements.scaleSlider.addEventListener('input', (e) => {
                const scale = parseFloat(e.target.value);
                this.updateScaleDisplay(scale);
                if(this.callbacks.onScaleChange) {
                    this.callbacks.onScaleChange(scale);
                }
            });
        }
        
        // スケールボタン
        const scaleButtons = [
            { btn: this.elements.scale05, value: 0.5 },
            { btn: this.elements.scale1, value: 1.0 },
            { btn: this.elements.scale2, value: 2.0 },
            { btn: this.elements.scale5, value: 5.0 }
        ];
        
        scaleButtons.forEach(({ btn, value }) => {
            if(btn) {
                btn.addEventListener('click', () => {
                    this.setScale(value);
                });
            }
        });
        
        // 音声入力ボタン
        if(this.elements.voiceButton) {
            this.elements.voiceButton.addEventListener('click', () => {
                if(this.callbacks.onVoiceInput) {
                    this.callbacks.onVoiceInput();
                }
            });
        }
        
        // 入力方法選択
        if(this.elements.voiceInputBtn) {
            this.elements.voiceInputBtn.addEventListener('click', () => {
                this.hideInputMethodDialog();
                if(this.callbacks.onChooseVoice) {
                    this.callbacks.onChooseVoice();
                }
            });
        }
        
        if(this.elements.keyboardInputBtn) {
            this.elements.keyboardInputBtn.addEventListener('click', () => {
                this.hideInputMethodDialog();
                if(this.callbacks.onChooseKeyboard) {
                    this.callbacks.onChooseKeyboard();
                }
            });
        }
        
        // メモ送信
        if(this.elements.submitMemoBtn) {
            this.elements.submitMemoBtn.addEventListener('click', () => {
                const text = this.elements.memoTextarea.value.trim();
                this.hideMemoInputDialog();
                if(this.callbacks.onSubmitMemo) {
                    this.callbacks.onSubmitMemo(text);
                }
            });
        }
        
        // メモキャンセル
        if(this.elements.cancelMemoBtn) {
            this.elements.cancelMemoBtn.addEventListener('click', () => {
                this.hideMemoInputDialog();
                if(this.callbacks.onCancelMemo) {
                    this.callbacks.onCancelMemo();
                }
            });
        }
        
        // Mキーでメモモード切替
        document.addEventListener('keydown', (e) => {
            if(e.code === 'KeyM' && !this.isDialogOpen()) {
                if(this.callbacks.onToggleMemoMode) {
                    this.callbacks.onToggleMemoMode();
                }
            }
        });
    }
    
    // コールバック登録
    on(event, callback) {
        this.callbacks[event] = callback;
    }
    
    // スケール設定
    setScale(scale) {
        if(this.elements.scaleSlider) {
            this.elements.scaleSlider.value = scale;
        }
        this.updateScaleDisplay(scale);
        if(this.callbacks.onScaleChange) {
            this.callbacks.onScaleChange(scale);
        }
    }
    
    // スケール表示更新
    updateScaleDisplay(scale) {
        if(this.elements.scaleValue) {
            this.elements.scaleValue.textContent = `${scale.toFixed(1)}x`;
        }
    }
    
    // ステータス表示
    showStatus(message) {
        if(this.elements.status) {
            this.elements.status.textContent = message;
        }
    }
    
    // ローディング表示/非表示
    showLoading() {
        if(this.elements.loading) {
            this.elements.loading.style.display = 'block';
        }
    }
    
    hideLoading() {
        if(this.elements.loading) {
            this.elements.loading.style.display = 'none';
        }
    }
    
    // メモモードインジケーター
    showMemoModeIndicator() {
        if(this.elements.memoModeIndicator) {
            this.elements.memoModeIndicator.style.display = 'block';
            setTimeout(() => {
                this.elements.memoModeIndicator.style.display = 'none';
            }, 2000);
        }
    }
    
    hideMemoModeIndicator() {
        if(this.elements.memoModeIndicator) {
            this.elements.memoModeIndicator.style.display = 'none';
        }
    }
    
    // メモパネル表示/非表示
    showMemoPanel() {
        if(this.elements.memoPanel) {
            this.elements.memoPanel.style.display = 'block';
        }
    }
    
    hideMemoPanel() {
        if(this.elements.memoPanel) {
            this.elements.memoPanel.style.display = 'none';
        }
    }
    
    // 入力方法ダイアログ
    showInputMethodDialog() {
        if(this.elements.inputMethodDialog) {
            this.elements.inputMethodDialog.style.display = 'block';
        }
    }
    
    hideInputMethodDialog() {
        if(this.elements.inputMethodDialog) {
            this.elements.inputMethodDialog.style.display = 'none';
        }
    }
    
    // メモ入力ダイアログ
    showMemoInputDialog() {
        if(this.elements.memoInputDialog) {
            this.elements.memoTextarea.value = '';
            this.elements.memoInputDialog.style.display = 'block';
        }
    }
    
    hideMemoInputDialog() {
        if(this.elements.memoInputDialog) {
            this.elements.memoInputDialog.style.display = 'none';
        }
    }
    
    // メモリスト更新
    updateMemoList(memos) {
        if(!this.elements.memoList) return;
        
        this.elements.memoList.innerHTML = '';
        
        if(memos.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.style.color = '#888';
            emptyMsg.style.textAlign = 'center';
            emptyMsg.style.padding = '20px';
            emptyMsg.textContent = 'メモがありません';
            this.elements.memoList.appendChild(emptyMsg);
            return;
        }
        
        memos.forEach(memo => {
            const item = document.createElement('div');
            item.className = 'memo-item';
            
            const textDiv = document.createElement('div');
            textDiv.style.marginBottom = '8px';
            textDiv.style.wordBreak = 'break-word';
            const displayText = memo.text.length > 50 ? 
                memo.text.substring(0, 50) + '...' : memo.text;
            textDiv.textContent = displayText;
            
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '削除';
            deleteBtn.onclick = () => {
                if(confirm(`メモ「${displayText}」を削除しますか?`)) {
                    if(this.callbacks.onDeleteMemo) {
                        this.callbacks.onDeleteMemo(memo.id);
                    }
                }
            };
            
            item.appendChild(textDiv);
            item.appendChild(deleteBtn);
            this.elements.memoList.appendChild(item);
        });
    }
    
    // VRボタン状態更新
    setVRButtonState(supported, text) {
        if(this.elements.vrButton) {
            this.elements.vrButton.disabled = !supported;
            this.elements.vrButton.textContent = text || 'VRモード開始';
        }
    }
    
    // 音声ボタン状態更新
    setVoiceButtonState(supported, recording) {
        if(!this.elements.voiceButton) return;
        
        if(!supported) {
            this.elements.voiceButton.disabled = true;
            this.elements.voiceButton.textContent = '🎤 非対応';
        } else if(recording) {
            this.elements.voiceButton.classList.add('recording');
            this.elements.voiceButton.textContent = '🎤 録音中...';
        } else {
            this.elements.voiceButton.classList.remove('recording');
            this.elements.voiceButton.textContent = '🎤 音声入力';
        }
    }
    
    // ダイアログが開いているか
    isDialogOpen() {
        const dialogs = [
            this.elements.inputMethodDialog,
            this.elements.memoInputDialog
        ];
        return dialogs.some(el => el && el.style.display === 'block');
    }
    
    // バージョン表示
    setVersion(version, date) {
        const updateDate = document.getElementById('updateDate');
        if(updateDate) {
            updateDate.textContent = `${version} (${date})`;
        }
    }
}