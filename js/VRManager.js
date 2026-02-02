// js/VRManager.js
// 更新日時: 2026/01/30 15:35:00
export class VRManager {
    constructor(renderer, cameraRig, camera, scene, THREE) {
        this.VERSION = 'VRManager v1.0.5 - 2026/01/30 15:35';
        console.log('🎮', this.VERSION);
        
        this.renderer = renderer;
        this.cameraRig = cameraRig;
        this.camera = camera;
        this.scene = scene;
        this.THREE = THREE;
        
        this.controllers = [];
        this.controllerGrips = [];
        this.isActive = false;
        
        this.moveSpeed = 10;
        this.rotationSpeed = 1.5;
        
        this.debugPanel = null;
        this.debugCanvas = null;
        
        // トリガー状態追跡
        this.triggerWasPressed = false;
        this.leftTriggerWasPressed = false;
    }
    
    // VRセッション開始
    async startSession() {
        try {
            this.cleanup();
            
            const session = await navigator.xr.requestSession('immersive-vr', {
                optionalFeatures: ['local-floor', 'bounded-floor']
            });
            
            await this.renderer.xr.setSession(session);
            this.isActive = true;
            
            this.initControllers();
            
            // デバッグパネルを再作成（カメラの子として追加）
            this.createDebugPanel();
            
            session.addEventListener('end', () => {
                this.isActive = false;
                this.cleanup();
            });
            
            console.log('VRセッション開始');
        } catch(error) {
            console.error('VR起動失敗:', error);
            throw error;
        }
    }
    
    // コントローラー初期化
    initControllers() {
        const THREE = this.THREE;
        
        // 左コントローラー
        const controller0 = this.renderer.xr.getController(0);
        this.cameraRig.add(controller0);
        this.controllers.push(controller0);
        
        // 右コントローラー
        const controller1 = this.renderer.xr.getController(1);
        this.cameraRig.add(controller1);
        this.controllers.push(controller1);
        
        // グリップ（視覚表示用）
        const grip0 = this.renderer.xr.getControllerGrip(0);
        const grip1 = this.renderer.xr.getControllerGrip(1);
        
        // コントローラーメッシュ
        const geom = new THREE.BoxGeometry(0.05, 0.05, 0.15);
        const mat0 = new THREE.MeshStandardMaterial({
            color: 0xff5555,
            emissive: 0xff2222,
            emissiveIntensity: 0.3
        });
        const mat1 = new THREE.MeshStandardMaterial({
            color: 0x5555ff,
            emissive: 0x2222ff,
            emissiveIntensity: 0.3
        });
        
        const mesh0 = new THREE.Mesh(geom, mat0);
        mesh0.position.z = -0.075;
        grip0.add(mesh0);
        
        const mesh1 = new THREE.Mesh(geom, mat1);
        mesh1.position.z = -0.075;
        grip1.add(mesh1);
        
        this.cameraRig.add(grip0);
        this.cameraRig.add(grip1);
        this.controllerGrips.push(grip0);
        this.controllerGrips.push(grip1);
        
        // レイキャストライン
        const lineGeom0 = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, -1)  // -2 → -1 に変更
        ]);
        const lineGeom1 = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, -1)  // -2 → -1 に変更
        ]);
        const lineMat0 = new THREE.LineBasicMaterial({ color: 0xff0000 });
        const lineMat1 = new THREE.LineBasicMaterial({ color: 0x0000ff });
        
        controller0.add(new THREE.Line(lineGeom0, lineMat0));
        controller1.add(new THREE.Line(lineGeom1, lineMat1));
        
        console.log('コントローラー初期化完了');
    }
    
    // クリーンアップ
    cleanup() {
        // デバッグパネルをカメラから削除
        if(this.debugPanel && this.camera) {
            this.camera.remove(this.debugPanel);
        }
        
        // コントローラー削除
        this.controllers.forEach(controller => {
            while(controller.children.length > 0) {
                const child = controller.children[0];
                if(child.geometry) child.geometry.dispose();
                if(child.material) {
                    if(Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
                controller.remove(child);
            }
            this.cameraRig.remove(controller);
        });
        
        // グリップ削除
        this.controllerGrips.forEach(grip => {
            while(grip.children.length > 0) {
                const child = grip.children[0];
                if(child.geometry) child.geometry.dispose();
                if(child.material) {
                    if(Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
                grip.remove(child);
            }
            this.cameraRig.remove(grip);
        });
        
        this.controllers = [];
        this.controllerGrips = [];
        
        // トリガー状態もリセット
        this.triggerWasPressed = false;
        this.leftTriggerWasPressed = false;
    }
    
    // デバッグパネル作成
    createDebugPanel() {
        const THREE = this.THREE;
        
        this.debugCanvas = document.createElement('canvas');
        this.debugCanvas.width = 512;
        this.debugCanvas.height = 512;
        
        const texture = new THREE.CanvasTexture(this.debugCanvas);
        texture.minFilter = THREE.LinearFilter;
        
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide,
            depthTest: false
        });
        
        this.debugPanel = new THREE.Mesh(
            new THREE.PlaneGeometry(0.6, 0.6),  // サイズを小さく調整
            material
        );
        
        // カメラの子として追加（カメラに追従）
        // 左上に配置：X=-0.4（左）、Y=0.3（上）、Z=-1（前方1m）
        this.debugPanel.position.set(-0.4, 0.3, -1);
        this.debugPanel.renderOrder = 9999;
        
        this.camera.add(this.debugPanel);
        
        this.updateDebugPanel('VR Debug\nReady\n' + this.VERSION);
        
        console.log('✅ デバッグパネル作成完了（カメラ追従モード）');
    }
    
    // デバッグパネル更新
    updateDebugPanel(text) {
        if(!this.debugCanvas) return;
        
        const ctx = this.debugCanvas.getContext('2d');
        ctx.clearRect(0, 0, 512, 512);
        
        // 背景
        ctx.fillStyle = 'rgba(0,0,0,0.9)';
        ctx.fillRect(0, 0, 512, 512);
        
        // 枠
        ctx.strokeStyle = '#0f0';
        ctx.lineWidth = 4;
        ctx.strokeRect(0, 0, 512, 512);
        
        // テキスト
        ctx.fillStyle = '#0f0';
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        text.split('\n').forEach((line, i) => {
            ctx.fillText(line, 15, 15 + i * 28);
        });
        
        if(this.debugPanel?.material?.map) {
            this.debugPanel.material.map.needsUpdate = true;
        }
    }
    
    // 毎フレーム更新
    update(delta, callbacks = {}) {
        if(!this.isActive) return;
        
        const session = this.renderer.xr.getSession();
        if(!session) return;
        
        if(!session.inputSources || session.inputSources.length === 0) {
            this.updateDebugPanel('No input sources\n' + this.VERSION);
            return;
        }
        
        const debugInfo = ['VR Active', this.VERSION, ''];

        // VRキーボードの状態を取得
        const isKeyboardActive = callbacks.isKeyboardActive || false;
        const isVoiceRecording = callbacks.isVoiceRecording || false;
        const keyboardInput = callbacks.keyboardInput || '';
        const keyboardVersion = callbacks.keyboardVersion || 'Unknown';

        if(isKeyboardActive) {
            debugInfo.push('** KEYBOARD MODE **');
            debugInfo.push(keyboardVersion);
            debugInfo.push('両手でキー入力可能');
            
            if(isVoiceRecording) {
                debugInfo.push('🎤 音声認識中...');
            } else {
                debugInfo.push(`入力: [${keyboardInput}]`);
            }
            
            debugInfo.push('');
        }
        
        // 各コントローラーの処理
        for(let i = 0; i < session.inputSources.length; i++) {
            const inputSource = session.inputSources[i];
            const gamepad = inputSource.gamepad;
            
            if(!gamepad) {
                debugInfo.push(`${inputSource.handedness}: No gamepad`);
                continue;
            }
            
            debugInfo.push(`${inputSource.handedness}:`);
            
            // 左コントローラー
            if(inputSource.handedness === 'left') {
                this.handleLeftController(gamepad, delta, debugInfo, callbacks, isKeyboardActive);
            }
            
            // 右コントローラー
            if(inputSource.handedness === 'right') {
                this.handleRightController(gamepad, delta, debugInfo, callbacks);
            }
        }
        
        this.updateDebugPanel(debugInfo.join('\n'));
    }
    
// 左コントローラー処理（キーボードモード対応）
handleLeftController(gamepad, delta, debugInfo, callbacks, isKeyboardActive) {
    const THREE = this.THREE;
    
    // キーボードモードでない場合のみ移動処理
    if(!isKeyboardActive) {
        // スティック入力
        let moveX = 0, moveZ = 0;
        if(Math.abs(gamepad.axes[0]) > 0.05) moveX = gamepad.axes[0];
        if(Math.abs(gamepad.axes[1]) > 0.05) moveZ = -gamepad.axes[1];
        if(Math.abs(gamepad.axes[2]) > 0.05) moveX = gamepad.axes[2];
        if(Math.abs(gamepad.axes[3]) > 0.05) moveZ = -gamepad.axes[3];
        
        // 移動処理
        if(Math.abs(moveX) > 0.05 || Math.abs(moveZ) > 0.05) {
            const cameraWorldQuaternion = new THREE.Quaternion();
            this.camera.getWorldQuaternion(cameraWorldQuaternion);
            
            const forward = new THREE.Vector3(0, 0, -1);
            forward.applyQuaternion(cameraWorldQuaternion);
            forward.y = 0;
            forward.normalize();
            
            const right = new THREE.Vector3(1, 0, 0);
            right.applyQuaternion(cameraWorldQuaternion);
            right.y = 0;
            right.normalize();
            
            const moveVector = new THREE.Vector3();
            moveVector.add(forward.multiplyScalar(moveZ * this.moveSpeed * delta));
            moveVector.add(right.multiplyScalar(moveX * this.moveSpeed * delta));
            
            this.cameraRig.position.x += moveVector.x;
            this.cameraRig.position.z += moveVector.z;
            
            debugInfo.push(`  Moving: X=${moveX.toFixed(2)} Z=${moveZ.toFixed(2)}`);
        }
        
        // 上下移動（Aボタン：上、Bボタン：下）
        if(gamepad.buttons[0] && gamepad.buttons[0].pressed) {
            this.cameraRig.position.y += this.moveSpeed * delta;
            debugInfo.push('  UP');
        }
        if(gamepad.buttons[1] && gamepad.buttons[1].pressed) {
            this.cameraRig.position.y -= this.moveSpeed * delta;
            if(this.cameraRig.position.y < 0) this.cameraRig.position.y = 0;
            debugInfo.push('  DOWN');
        }
        
        // キーボードモードでない時は左トリガー状態をリセット
        this.leftTriggerWasPressed = false;
    }
    
    // キーボードモードの場合は左トリガーでキー入力
    if(isKeyboardActive) {
        const trigger = gamepad.buttons[0];
        const isTriggerPressed = trigger && trigger.pressed;
        
        // 押された瞬間を検出
        if(isTriggerPressed && !this.leftTriggerWasPressed) {
            if(callbacks.onLeftTriggerPress) {
                callbacks.onLeftTriggerPress(this.controllers[0]);
            }
            debugInfo.push('  LEFT TRIGGER DOWN (KEY INPUT)');
        }
        
        // 離された瞬間を検出
        if(!isTriggerPressed && this.leftTriggerWasPressed) {
            debugInfo.push('  LEFT TRIGGER UP');
        }
        
        // 状態を保存
        this.leftTriggerWasPressed = isTriggerPressed;
    }
}

    
    // 右コントローラー処理（視点、インタラクション）
    handleRightController(gamepad, delta, debugInfo, callbacks) {
        const axes = gamepad.axes;
        
        // 視点回転
        if(axes.length >= 4) {
            const rotX = axes[2] || 0;
            const rotY = axes[3] || 0;
            
            if(Math.abs(rotX) > 0.1) {
                this.cameraRig.rotation.y -= rotX * this.rotationSpeed * delta;
                debugInfo.push(`  Rot Y: ${rotX.toFixed(2)}`);
            }
            
            if(Math.abs(rotY) > 0.1) {
                this.camera.rotation.x -= rotY * this.rotationSpeed * delta;
                this.camera.rotation.x = Math.max(-Math.PI/3, Math.min(Math.PI/3, this.camera.rotation.x));
                debugInfo.push(`  Rot X: ${rotY.toFixed(2)}`);
            }
        }
        
        // トリガー処理（エッジ検出）
        const trigger = gamepad.buttons[0];
        const isTriggerPressed = trigger && trigger.pressed;
        
        // 押された瞬間を検出
        if(isTriggerPressed && !this.triggerWasPressed) {
            if(callbacks.onTriggerPress) {
                callbacks.onTriggerPress(this.controllers[1]);
            }
            debugInfo.push('  RIGHT TRIGGER DOWN');
        }
        
        // 離された瞬間を検出
        if(!isTriggerPressed && this.triggerWasPressed) {
            if(callbacks.onTriggerRelease) {
                callbacks.onTriggerRelease();
            }
            debugInfo.push('  RIGHT TRIGGER UP');
        }
        
        // 状態を保存
        this.triggerWasPressed = isTriggerPressed;
        
        // グリップ
        const grip = gamepad.buttons[1];
        if(grip && grip.pressed) {
            if(callbacks.onGripPress) {
                callbacks.onGripPress();
            }
            debugInfo.push('  GRIP');
        }
    }
    
    // 左コントローラーのレイキャスター取得
    getLeftRaycaster() {
        if(!this.isActive || this.controllers.length < 1) return null;
        
        const THREE = this.THREE;
        const raycaster = new THREE.Raycaster();
        const controller = this.controllers[0]; // 左コントローラー
        
        const controllerWorldPos = new THREE.Vector3();
        const controllerWorldQuat = new THREE.Quaternion();
        controller.getWorldPosition(controllerWorldPos);
        controller.getWorldQuaternion(controllerWorldQuat);
        
        const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(controllerWorldQuat);
        raycaster.set(controllerWorldPos, direction);
        
        return raycaster;
    }
    
    // 右コントローラーのレイキャスター取得
    getRaycaster() {
        if(!this.isActive || this.controllers.length < 2) return null;
        
        const THREE = this.THREE;
        const raycaster = new THREE.Raycaster();
        const controller = this.controllers[1]; // 右コントローラー
        
        const controllerWorldPos = new THREE.Vector3();
        const controllerWorldQuat = new THREE.Quaternion();
        controller.getWorldPosition(controllerWorldPos);
        controller.getWorldQuaternion(controllerWorldQuat);
        
        const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(controllerWorldQuat);
        raycaster.set(controllerWorldPos, direction);
        
        return raycaster;
    }
}
