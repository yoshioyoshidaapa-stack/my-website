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
        this.controllerGrips = [];

        // トリガー・グリップ状態
        this.rightTriggerPressed = false;
        this.rightGripPressed = false;
        this.leftTriggerPressed = false;

        // レイキャスター
        this.rightRaycaster = new THREE.Raycaster();
        this.leftRaycaster = new THREE.Raycaster();

        this._setupControllers();
    }

    _setupControllers() {
        const THREE = this.THREE;

        // コントローラーライン（視線表示用）
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

            // トリガー（buttons[0]）
            const triggerPressed = gp.buttons[0] && gp.buttons[0].pressed;
            // グリップ（buttons[1]）
            const gripPressed = gp.buttons[1] && gp.buttons[1].pressed;

            if (isRight) {
                // 右トリガー
                if (triggerPressed && !this.rightTriggerPressed) {
                    this.rightTriggerPressed = true;
                    if (onTriggerPress) onTriggerPress(this.controllers[0]);
                }
                if (!triggerPressed && this.rightTriggerPressed) {
                    this.rightTriggerPressed = false;
                    if (onTriggerRelease) onTriggerRelease();
                }
                // 右グリップ
                if (gripPressed && !this.rightGripPressed) {
                    this.rightGripPressed = true;
                    if (onGripPress) onGripPress();
                }
                if (!gripPressed) this.rightGripPressed = false;
            }

            if (isLeft) {
                // 左トリガー
                if (triggerPressed && !this.leftTriggerPressed) {
                    this.leftTriggerPressed = true;
                    if (onLeftTriggerPress) onLeftTriggerPress(this.controllers[1]);
                }
                if (!triggerPressed) this.leftTriggerPressed = false;
            }
        }
    }
}
