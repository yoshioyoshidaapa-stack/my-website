// js/PlayerControls.js
export class PlayerControls {
    constructor(camera, cameraRig) {
        this.camera = camera;
        this.cameraRig = cameraRig;
        
        // 移動状態
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        
        // 速度
        this.velocity = { x: 0, z: 0 };
        this.moveSpeed = 80;
        
        // マウス
        this.isMouseDown = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        
        // カメラ
        this.euler = { x: 0, y: 0, z: 0 };
        this.fov = 75;
        this.minFov = 30;
        this.maxFov = 100;
        
        // イベント登録
        this.setupEvents();
    }
    
    // イベント設定
    setupEvents() {
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));
        
        const container = document.getElementById('container');
        if(container) {
            container.addEventListener('mousedown', (e) => this.onMouseDown(e));
            container.addEventListener('mousemove', (e) => this.onMouseMove(e));
            container.addEventListener('mouseup', () => this.onMouseUp());
            container.addEventListener('mouseleave', () => this.onMouseUp());
            container.addEventListener('wheel', (e) => this.onMouseWheel(e));
        }
    }
    
    // キー押下
    onKeyDown(e) {
        // ダイアログが開いている場合は無視
        if(this.isDialogOpen()) return;
        
        switch(e.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.moveForward = true;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.moveBackward = true;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.moveLeft = true;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.moveRight = true;
                break;
            case 'KeyQ':
                this.zoomIn();
                break;
            case 'KeyE':
                this.zoomOut();
                break;
        }
    }
    
    // キー解放
    onKeyUp(e) {
        switch(e.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.moveForward = false;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.moveBackward = false;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.moveLeft = false;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.moveRight = false;
                break;
        }
    }
    
    // マウス押下
    onMouseDown(e) {
        if(this.isDialogOpen()) return;
        
        this.isMouseDown = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
    }
    
    // マウス移動
    onMouseMove(e) {
        if(!this.isMouseDown) return;
        
        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        
        // カメラ回転
        this.euler.y -= dx * 0.002;
        this.euler.x -= dy * 0.002;
        this.euler.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.euler.x));
        
        this.camera.rotation.set(this.euler.x, this.euler.y, this.euler.z);
    }
    
    // マウス解放
    onMouseUp() {
        this.isMouseDown = false;
    }
    
    // マウスホイール
    onMouseWheel(e) {
        e.preventDefault();
        if(e.deltaY < 0) {
            this.zoomIn();
        } else {
            this.zoomOut();
        }
    }
    
    // ズームイン
    zoomIn() {
        this.fov = Math.max(this.minFov, this.fov - 5);
        this.camera.fov = this.fov;
        this.camera.updateProjectionMatrix();
    }
    
    // ズームアウト
    zoomOut() {
        this.fov = Math.min(this.maxFov, this.fov + 5);
        this.camera.fov = this.fov;
        this.camera.updateProjectionMatrix();
    }
    
    // 毎フレーム更新
    update(delta) {
        // 速度減衰
        this.velocity.x -= this.velocity.x * 10 * delta;
        this.velocity.z -= this.velocity.z * 10 * delta;
        
        // 移動方向
        const direction = {
            z: (this.moveBackward ? 1 : 0) - (this.moveForward ? 1 : 0),
            x: (this.moveLeft ? 1 : 0) - (this.moveRight ? 1 : 0)
        };
        
        // 正規化
        const length = Math.sqrt(direction.x * direction.x + direction.z * direction.z);
        if(length > 0) {
            direction.x /= length;
            direction.z /= length;
        }
        
        // 速度更新
        if(this.moveForward || this.moveBackward) {
            this.velocity.z -= direction.z * this.moveSpeed * delta;
        }
        if(this.moveLeft || this.moveRight) {
            this.velocity.x -= direction.x * this.moveSpeed * delta;
        }
        
        // カメラ移動（カメラの向きに応じて）
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(this.camera.quaternion);
        forward.y = 0;
        forward.normalize();
        
        const right = new THREE.Vector3(1, 0, 0);
        right.applyQuaternion(this.camera.quaternion);
        right.y = 0;
        right.normalize();
        
        this.camera.position.add(forward.multiplyScalar(this.velocity.z * delta));
        this.camera.position.add(right.multiplyScalar(this.velocity.x * delta));
        
        // 高さ制限
        if(this.camera.position.y < 1.6) {
            this.camera.position.y = 1.6;
        }
    }
    
    // カメラリセット
    reset() {
        this.camera.position.set(0, 1.6, 5);
        this.camera.rotation.set(0, 0, 0);
        this.euler = { x: 0, y: 0, z: 0 };
        this.fov = 75;
        this.camera.fov = this.fov;
        this.camera.updateProjectionMatrix();
        this.velocity = { x: 0, z: 0 };
    }
    
    // ダイアログが開いているか確認
    isDialogOpen() {
        const dialogs = ['inputMethodDialog', 'memoInputDialog'];
        return dialogs.some(id => {
            const el = document.getElementById(id);
            return el && el.style.display === 'block';
        });
    }
}