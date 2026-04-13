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

        // トリガー・グリップ状態
        this.rightTriggerPressed = false;
        this.rightGripPressed = false;
        this.leftTriggerPressed = false;

        // レイキャスター
        this.rightRaycaster = new THREE.Raycaster();
        this.leftRaycaster = new THREE.Raycaster();

        // 移動設定
        this.moveSpeed = 3.0;
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
            controller.add(new THREE.Line(lineGeometry, lineMaterial));
            this.scene.add(controller);
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

    // 右コントローラーのレイキャスター取得
    getRaycaster() {
        const controller = this.controllers[0];
        if (!controller) return null;
        const THREE = this.THREE;
        const pos = new THREE.Vector3();
        const dir = new THREE.Vector3(0, 0, -1);
        controller.getWorldPosition(pos);
        dir.applyQuaternion(controller.quaternion);
        this.rightRaycaster.set(pos, dir);
        return this.rightRaycaster;
    }

    // 左コントローラーのレイキャスター取得
    getLeftRaycaster() {
        const controller = this.controllers[1];
        if (!controller) return null;
        const THREE = this.THREE;
        const pos = new THREE.Vector3();
        const dir = new THREE.Vector3(0, 0, -1);
        controller.getWorldPosition(pos);
        dir.applyQuaternion(controller.quaternion);
        this.leftRaycaster.set(pos, dir);
        return this.leftRaycaster;
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

        for (const source of session.inputSources) {
            if (!source.gamepad) continue;
            const gp = source.gamepad;
            const isRight = source.handedness === 'right';
            const isLeft = source.handedness === 'left';

            const triggerPressed = gp.buttons[0] && gp.buttons[0].pressed;
            const gripPressed = gp.buttons[1] && gp.buttons[1].pressed;

            // --- スティック移動 ---
            // 左スティック: axes[2]=左右, axes[3]=前後 → cameraRig移動
            // 右スティック: axes[2]=左右 → 回転
            if (isLeft && gp.axes.length >= 4) {
                const axisX = gp.axes[2]; // 左右
                const axisY = gp.axes[3]; // 前後（上向きが-1）

                const deadzone = 0.15;
                if (Math.abs(axisX) > deadzone || Math.abs(axisY) > deadzone) {
                    const THREE = this.THREE;

                    // カメラの向いている水平方向を取得
                    const forward = new THREE.Vector3(0, 0, -1);
                    forward.applyQuaternion(this.camera.quaternion);
                    forward.y = 0;
                    forward.normalize();

                    const right = new THREE.Vector3(1, 0, 0);
                    right.applyQuaternion(this.camera.quaternion);
                    right.y = 0;
                    right.normalize();

                    if (Math.abs(axisY) > deadzone) {
                        this.cameraRig.position.addScaledVector(forward, -axisY * this.moveSpeed * delta);
                    }
                    if (Math.abs(axisX) > deadzone) {
                        this.cameraRig.position.addScaledVector(right, axisX * this.moveSpeed * delta);
                    }
                }
            }

            // 右スティック: axes[2]=左右 → 水平回転
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
                    if (onTriggerPress) onTriggerPress(this.controllers[0]);
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
                    if (onLeftTriggerPress) onLeftTriggerPress(this.controllers[1]);
                }
                if (!triggerPressed) this.leftTriggerPressed = false;
            }
        }
    }
}
