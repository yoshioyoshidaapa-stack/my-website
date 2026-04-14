// js/VRManager.js
export class VRManager {
    constructor(renderer, cameraRig, camera, scene, THREE) {
        this.renderer = renderer;
        this.cameraRig = cameraRig;
        this.camera = camera;
        this.scene = scene;
        this.THREE = THREE;

        this.session = null;
        this.controllers = [];

        // 左右コントローラー参照（handednessで動的に割り当て）
        this._rightController = null;
        this._leftController = null;

        // トリガー・グリップ状態
        this.rightTriggerPressed = false;
        this.rightGripPressed = false;
        this.leftTriggerPressed = false;
        this.leftGripPressed = false;

        // レイキャスター
        this._raycaster = new THREE.Raycaster();

        // 移動設定
        this.moveSpeed = 4.5;
        this.turnSpeed = 1.5;

        this._setupControllers();
    }

    _setupControllers() {
        const THREE = this.THREE;

        const lineGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, -5)
        ]);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });

        for (let i = 0; i < 2; i++) {
            const controller = this.renderer.xr.getController(i);
            controller.add(new THREE.Line(lineGeometry.clone(), lineMaterial.clone()));
            this.cameraRig.add(controller);
            this.controllers.push(controller);
        }
    }

    // VRセッション開始
    async startSession() {
        if (!('xr' in navigator)) throw new Error('WebXR非対応');
        const supported = await navigator.xr.isSessionSupported('immersive-vr');
        if (!supported) throw new Error('immersive-VR非対応');

        this.session = await navigator.xr.requestSession('immersive-vr', {
            optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking']
        });
        await this.renderer.xr.setSession(this.session);

        this.session.addEventListener('end', () => {
            this.session = null;
        });
    }

    // 指定コントローラーからレイキャスター生成
    _buildRaycaster(controller) {
        if (!controller) return null;
        const THREE = this.THREE;
        const pos = new THREE.Vector3();
        const quat = new THREE.Quaternion();
        const dir = new THREE.Vector3(0, 0, -1);
        controller.getWorldPosition(pos);
        controller.getWorldQuaternion(quat);
        dir.applyQuaternion(quat);
        this._raycaster.set(pos, dir);
        return this._raycaster;
    }

    // 右コントローラーのレイキャスター
    getRaycaster() {
        return this._buildRaycaster(this._rightController);
    }

    // 左コントローラーのレイキャスター
    getLeftRaycaster() {
        return this._buildRaycaster(this._leftController);
    }

    // 毎フレーム更新
    update(delta, options = {}) {
        const {
            onTriggerPress,
            onTriggerRelease,
            onGripPress,
            onLeftTriggerPress
        } = options;

        const session = this.renderer.xr.getSession();
        if (!session) return;

        const THREE = this.THREE;

        // カメラのワールド方向を取得
        const worldQuat = new THREE.Quaternion();
        this.camera.getWorldQuaternion(worldQuat);
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(worldQuat);
        forward.y = 0;
        forward.normalize();
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(worldQuat);
        right.y = 0;
        right.normalize();

        // inputSources をインデックス付きでループ（controllers[i]と対応）
        for (let i = 0; i < session.inputSources.length; i++) {
            const source = session.inputSources[i];
            if (!source.gamepad) continue;
            const gp = source.gamepad;
            const controller = this.controllers[i];
            const isRight = source.handedness === 'right';
            const isLeft  = source.handedness === 'left';

            // handednessに基づいて左右コントローラー参照を更新
            if (isRight) this._rightController = controller;
            if (isLeft)  this._leftController = controller;

            const triggerPressed = gp.buttons[0]?.pressed ?? false;
            const gripPressed    = gp.buttons[1]?.pressed ?? false;

            // --- 左スティック: 目線方向に前後左右移動 ---
            if (isLeft && gp.axes.length >= 4) {
                const axisX = gp.axes[2];
                const axisY = gp.axes[3];
                const deadzone = 0.15;
                if (Math.abs(axisY) > deadzone) {
                    this.cameraRig.position.addScaledVector(forward, -axisY * this.moveSpeed * delta);
                }
                if (Math.abs(axisX) > deadzone) {
                    this.cameraRig.position.addScaledVector(right, axisX * this.moveSpeed * delta);
                }
            }

            // --- 右スティック左右: 水平回転 ---
            if (isRight && gp.axes.length >= 3) {
                const axisX = gp.axes[2];
                const deadzone = 0.15;
                if (Math.abs(axisX) > deadzone) {
                    this.cameraRig.rotation.y -= axisX * this.turnSpeed * delta;
                }
            }

            // --- ボタン処理 ---
            if (isRight) {
                if (triggerPressed && !this.rightTriggerPressed) {
                    this.rightTriggerPressed = true;
                    if (onTriggerPress) onTriggerPress(controller);
                }
                if (!triggerPressed && this.rightTriggerPressed) {
                    this.rightTriggerPressed = false;
                    if (onTriggerRelease) onTriggerRelease();
                }
                if (gripPressed && !this.rightGripPressed) {
                    this.rightGripPressed = true;
                    if (onGripPress) onGripPress();
                }
                if (!gripPressed) this.rightGripPressed = false;
            }

            if (isLeft) {
                if (triggerPressed && !this.leftTriggerPressed) {
                    this.leftTriggerPressed = true;
                    if (onLeftTriggerPress) onLeftTriggerPress(controller);
                }
                if (!triggerPressed) this.leftTriggerPressed = false;

                // キーボード非アクティブ時: 左トリガーで上移動、左グリップで下移動
                if (!options.isKeyboardActive) {
                    const vertSpeed = this.moveSpeed * 0.5;
                    if (triggerPressed) {
                        this.cameraRig.position.y += vertSpeed * delta;
                    }
                    if (gripPressed) {
                        this.cameraRig.position.y -= vertSpeed * delta;
                    }
                }
                if (!gripPressed) this.leftGripPressed = false;
                if (gripPressed && !this.leftGripPressed) this.leftGripPressed = true;
            }
        }
    }
}
