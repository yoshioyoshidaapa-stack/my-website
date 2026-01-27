// js/SceneManager.js
export class SceneManager {
    constructor(THREE) {
        this.THREE = THREE;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.cameraRig = null;
    }
    
    // シーン初期化
    init(container) {
        const THREE = this.THREE;
        
        // シーン作成
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        this.scene.fog = new THREE.Fog(0x87CEEB, 0, 50);
        
        // カメラリグ
        this.cameraRig = new THREE.Group();
        this.scene.add(this.cameraRig);
        
        // カメラ作成
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 1.6, 5);
        this.cameraRig.add(this.camera);
        
        // レンダラー作成
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.xr.enabled = true;
        container.appendChild(this.renderer.domElement);
        
        // ライト
        this.setupLights();
        
        // 床
        this.createFloor();
        
        // テスト用オブジェクト
        this.createTestObjects();
        
        // リサイズ対応
        window.addEventListener('resize', () => this.onResize());
    }
    
    // ライト設定
    setupLights() {
        const THREE = this.THREE;
        
        // 環境光
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        // 指向性ライト
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 5);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);
    }
    
    // 床作成
    createFloor() {
        const THREE = this.THREE;
        
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(50, 50),
            new THREE.MeshStandardMaterial({ color: 0x808080 })
        );
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);
    }
    
    // テスト用オブジェクト
    createTestObjects() {
        const THREE = this.THREE;
        
        const sphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.5, 32, 32),
            new THREE.MeshStandardMaterial({ color: 0xff0000 })
        );
        sphere.position.set(0, 0.5, -3);
        sphere.castShadow = true;
        this.scene.add(sphere);
    }
    
    // リサイズ処理
    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    // カメラリセット
    resetCamera() {
        this.camera.position.set(0, 1.6, 5);
        this.camera.rotation.set(0, 0, 0);
        this.camera.fov = 75;
        this.camera.updateProjectionMatrix();
    }
}