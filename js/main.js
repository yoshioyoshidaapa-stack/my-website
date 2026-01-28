// js/main.js
import * as THREE from 'https://cdn.skypack.dev/three@0.128.0';
import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/loaders/OBJLoader.js';
import { STLLoader } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/loaders/STLLoader.js';
import { FBXLoader } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/loaders/FBXLoader.js';

import { SceneManager } from './SceneManager.js';
import { MemoManager } from './MemoManager.js';
import { VRKeyboard } from './VRKeyboard.js';
import { VRManager } from './VRManager.js';
import { ModelLoader } from './ModelLoader.js';
import { PlayerControls } from './PlayerControls.js';
import { UIManager } from './UIManager.js';
import { SaveManager } from './SaveManager.js';

// グローバルに設定
window.THREE = THREE;
window.GLTFLoader = GLTFLoader;
window.OBJLoader = OBJLoader;
window.STLLoader = STLLoader;
window.FBXLoader = FBXLoader;

class VRShopApp {
    constructor() {
        // バージョン情報
        this.VERSION = 'モジュール版 v1.0.2';
        this.UPDATE_DATE = '2026/01/28';
        
        // マネージャー
        this.sceneManager = null;
        this.memoManager = null;
        this.vrKeyboard = null;
        this.vrManager = null;
        this.modelLoader = null;
        this.playerControls = null;
        this.uiManager = null;
        this.saveManager = null;
        
        // 状態
        this.memoMode = false;
        this.pendingMemoPosition = null;
        this.prevTime = performance.now();
        
        // VRトリガー状態管理
        this.vrTriggerPressed = false;
        
        this.init();
    }
    
    init() {
        console.log('VRショップアプリ初期化開始...');
        
        // UIマネージャー初期化
        this.uiManager = new UIManager();
        this.uiManager.setVersion(this.VERSION, this.UPDATE_DATE);
        
        // シーンマネージャー初期化
        this.sceneManager = new SceneManager(THREE);
        const container = document.getElementById('container');
        this.sceneManager.init(container);
        
        // メモマネージャー初期化
        this.memoManager = new MemoManager(
            this.sceneManager.scene,
            this.sceneManager.camera,
            THREE
        );
        
        // VRキーボード初期化
        this.vrKeyboard = new VRKeyboard(
            this.sceneManager.scene,
            this.sceneManager.camera,
            THREE
        );
        
        // VRマネージャー初期化
        this.vrManager = new VRManager(
            this.sceneManager.renderer,
            this.sceneManager.cameraRig,
            this.sceneManager.camera,
            this.sceneManager.scene,
            THREE
        );
        
        // モデルローダー初期化
        this.modelLoader = new ModelLoader(
            this.sceneManager.scene,
            THREE
        );
        
        // プレイヤーコントロール初期化
        this.playerControls = new PlayerControls(
            this.sceneManager.camera,
            this.sceneManager.cameraRig
        );
        
        // セーブマネージャー初期化
        this.saveManager = new SaveManager(
            this.sceneManager.scene,
            this.memoManager,
            this.modelLoader
        );
        
        // UIイベント設定
        this.setupUIEvents();
        
        // VRサポート確認
        this.checkVRSupport();
        
        // 音声認識サポート確認
        this.checkVoiceSupport();
        
        // アニメーションループ開始
        this.sceneManager.renderer.setAnimationLoop(() => this.animate());
        
        console.log('初期化完了！');
    }
    
    setupUIEvents() {
        // VR開始
        this.uiManager.on('onVRStart', async () => {
            try {
                await this.vrManager.startSession();
                this.uiManager.showStatus('VRモード開始');
            } catch(error) {
                this.uiManager.showStatus('VR起動失敗: ' + error.message);
            }
        });
        
        // カメラリセット
        this.uiManager.on('onReset', () => {
            this.playerControls.reset();
            this.sceneManager.resetCamera();
            this.uiManager.showStatus('カメラをリセットしました');
        });
        
        // モデルクリア
        this.uiManager.on('onClear', () => {
            this.modelLoader.clearModel();
            this.uiManager.showStatus('モデルを削除しました');
        });
        
        // セーブ
        this.uiManager.on('onSave', async () => {
            try {
                await this.saveManager.save();
                this.uiManager.showStatus('セーブ完了');
            } catch(error) {
                this.uiManager.showStatus('セーブエラー: ' + error.message);
            }
        });
        
        // ロード
        this.uiManager.on('onLoad', () => {
            this.uiManager.showLoading();
            this.saveManager.load(
                null,
                () => {
                    this.uiManager.hideLoading();
                    this.uiManager.showStatus('ロード完了');
                    this.uiManager.updateMemoList(this.memoManager.getAllMemos());
                },
                (error) => {
                    this.uiManager.hideLoading();
                    this.uiManager.showStatus('ロードエラー: ' + error.message);
                }
            );
        });
        
        // ファイル選択
        this.uiManager.on('onFileSelect', (file) => {
            if(!file) return;
            
            this.uiManager.showLoading();
            this.modelLoader.loadFile(
                file,
                null,
                (format) => {
                    this.uiManager.hideLoading();
                    this.uiManager.showStatus(`${format}モデル読み込み完了`);
                },
                (error) => {
                    this.uiManager.hideLoading();
                    this.uiManager.showStatus('読み込みエラー: ' + error.message);
                }
            );
        });
        
        // スケール変更
        this.uiManager.on('onScaleChange', (scale) => {
            this.modelLoader.setScale(scale);
        });
        
        // メモモード切替
        this.uiManager.on('onToggleMemoMode', () => {
            this.toggleMemoMode();
        });
        
        // 音声入力
        this.uiManager.on('onVoiceInput', () => {
            const dir = new THREE.Vector3();
            this.sceneManager.camera.getWorldDirection(dir);
            const pos = this.sceneManager.camera.position.clone().add(dir.multiplyScalar(3));
            
            this.uiManager.setVoiceButtonState(true, true);
            this.memoManager.startVoiceInput(pos, (id, text) => {
                this.uiManager.setVoiceButtonState(true, false);
                this.uiManager.updateMemoList(this.memoManager.getAllMemos());
                this.uiManager.showStatus('メモを作成しました');
            });
        });
        
        // 入力方法選択：音声
        this.uiManager.on('onChooseVoice', () => {
            if(this.pendingMemoPosition) {
                this.uiManager.setVoiceButtonState(true, true);
                this.memoManager.startVoiceInput(this.pendingMemoPosition, (id, text) => {
                    this.uiManager.setVoiceButtonState(true, false);
                    this.uiManager.updateMemoList(this.memoManager.getAllMemos());
                    this.toggleMemoMode();
                });
            }
        });
        
        // 入力方法選択：キーボード
        this.uiManager.on('onChooseKeyboard', () => {
            if(this.pendingMemoPosition) {
                this.uiManager.showMemoInputDialog();
            }
        });
        
        // メモ送信
        this.uiManager.on('onSubmitMemo', (text) => {
            if(text && this.pendingMemoPosition) {
                this.memoManager.create(this.pendingMemoPosition, text);
                this.uiManager.updateMemoList(this.memoManager.getAllMemos());
                this.toggleMemoMode();
            }
            this.pendingMemoPosition = null;
        });
        
        // メモキャンセル
        this.uiManager.on('onCancelMemo', () => {
            this.pendingMemoPosition = null;
        });
        
        // メモ削除
        this.uiManager.on('onDeleteMemo', (id) => {
            this.memoManager.delete(id);
            this.uiManager.updateMemoList(this.memoManager.getAllMemos());
        });
        
        // マウスクリックでメモ配置
        const container = document.getElementById('container');
        container.addEventListener('click', (e) => {
            if(this.memoMode && !this.uiManager.isDialogOpen()) {
                this.placeMemo(e);
            }
        });
    }
    
    // VRサポート確認
    async checkVRSupport() {
        if('xr' in navigator) {
            try {
                const supported = await navigator.xr.isSessionSupported('immersive-vr');
                if(supported) {
                    this.uiManager.setVRButtonState(true, 'VRモード開始');
                } else {
                    this.uiManager.setVRButtonState(false, 'VR非対応');
                }
            } catch(error) {
                this.uiManager.setVRButtonState(false, 'VR非対応');
            }
        } else {
            this.uiManager.setVRButtonState(false, 'VR非対応');
        }
    }
    
    // 音声認識サポート確認
    checkVoiceSupport() {
        const supported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
        this.uiManager.setVoiceButtonState(supported, false);
    }
    
    // メモモード切替
    toggleMemoMode() {
        this.memoMode = !this.memoMode;
        
        if(this.memoMode) {
            this.uiManager.showMemoModeIndicator();
            this.uiManager.showMemoPanel();
        } else {
            this.uiManager.hideMemoModeIndicator();
            this.uiManager.hideMemoPanel();
        }
    }
    
    // メモ配置
    placeMemo(event) {
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2(
            (event.clientX / window.innerWidth) * 2 - 1,
            -(event.clientY / window.innerHeight) * 2 + 1
        );
        
        raycaster.setFromCamera(mouse, this.sceneManager.camera);
        const hits = raycaster.intersectObjects(this.sceneManager.scene.children, true);
        
        let position;
        if(hits.length > 0) {
            const hit = hits[0];
            const offset = new THREE.Vector3();
            if(hit.face) {
                offset.copy(hit.face.normal);
                offset.transformDirection(hit.object.matrixWorld);
            } else {
                offset.subVectors(this.sceneManager.camera.position, hit.point).normalize();
            }
            position = hit.point.clone().add(offset.multiplyScalar(0.1));
        } else {
            const dir = new THREE.Vector3();
            this.sceneManager.camera.getWorldDirection(dir);
            position = this.sceneManager.camera.position.clone().add(dir.multiplyScalar(3));
        }
        
        this.pendingMemoPosition = position;
        this.uiManager.showInputMethodDialog();
    }
    
    // アニメーションループ
    animate() {
        const time = performance.now();
        const delta = (time - this.prevTime) / 1000;
        this.prevTime = time;
        
        if(this.sceneManager.renderer.xr.isPresenting) {
            // VRモード
            this.vrManager.update(delta, {
                // VRキーボードの状態を渡す
                isKeyboardActive: this.vrKeyboard.isActive,
                isVoiceRecording: this.vrKeyboard.isRecording,
    keyboardInput: this.vrKeyboard.input,                // 右トリガー押下時
                onTriggerPress: (controller) => {
                    // 既に押されている場合は無視
                    if(this.vrTriggerPressed) return;
                    
                    this.vrTriggerPressed = true;
                    console.log('VR右トリガー：押された');
                    
                    // VRキーボードが表示されている場合
                    if(this.vrKeyboard.isActive) {
                        const raycaster = this.vrManager.getRaycaster();
                        if(raycaster) {
                            const key = this.vrKeyboard.detectKey(raycaster);
                            if(key) {
                                this.vrKeyboard.handleInput(key);
                            }
                        }
                    } else {
                        // 新規メモ作成
                        const controllerWorldPos = new THREE.Vector3();
                        controller.getWorldPosition(controllerWorldPos);
                        const direction = new THREE.Vector3(0, 0, -1);
                        const controllerWorldQuat = new THREE.Quaternion();
                        controller.getWorldQuaternion(controllerWorldQuat);
                        direction.applyQuaternion(controllerWorldQuat);
                        const position = controllerWorldPos.clone().add(direction.multiplyScalar(2));
                        
                        // VRキーボード表示
                        this.vrKeyboard.show((text) => {
                            if(text.trim()) {
                                this.memoManager.create(position, text);
                                this.uiManager.updateMemoList(this.memoManager.getAllMemos());
                                this.uiManager.showStatus('メモを作成しました');
                            }
                        });
                    }
                },
                
                // 右トリガー解放時
                onTriggerRelease: () => {
                    this.vrTriggerPressed = false;
                    console.log('VR右トリガー：離された');
                },
                
                // 左トリガー押下時（キーボードモード時のみ）
                onLeftTriggerPress: (controller) => {
                    console.log('VR左トリガー：押された');
                    
                    // VRキーボードが表示されている場合のみ
                    if(this.vrKeyboard.isActive) {
                        const raycaster = this.vrManager.getLeftRaycaster();
                        if(raycaster) {
                            const key = this.vrKeyboard.detectKey(raycaster);
                            if(key) {
                                this.vrKeyboard.handleInput(key);
                            }
                        }
                    }
                }
            });
        } else {
            // PCモード
            this.playerControls.update(delta);
        }
        
        // レンダリング
        this.sceneManager.renderer.render(
            this.sceneManager.scene,
            this.sceneManager.camera
        );
    }
}

// アプリ起動
window.addEventListener('DOMContentLoaded', () => {
    new VRShopApp();
});
