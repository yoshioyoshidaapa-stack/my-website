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
        this.scene.background = new THREE.Color(0xf0f0f0);
        this.scene.fog = new THREE.Fog(0xf0f0f0, 30, 80);
        
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

        // 環境マップ（メタリック素材の反射用）
        this.setupEnvironment();
        
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
    
    // 環境マップ設定（控えめなスタジオ風）
    setupEnvironment() {
        const THREE = this.THREE;
        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        pmremGenerator.compileEquirectangularShader();

        const envScene = new THREE.Scene();

        // ニュートラルな環境光
        const hemiLight = new THREE.HemisphereLight(0xcccccc, 0x444444, 0.2);
        envScene.add(hemiLight);

        // 控えめな方向性ライト
        const sunLight = new THREE.DirectionalLight(0xffffff, 0.3);
        sunLight.position.set(5, 10, 3);
        envScene.add(sunLight);

        // グレーの背景球
        const envSphere = new THREE.Mesh(
            new THREE.SphereGeometry(100, 16, 16),
            new THREE.MeshBasicMaterial({ color: 0x555555, side: THREE.BackSide })
        );
        envScene.add(envSphere);

        const envMap = pmremGenerator.fromScene(envScene, 0.04).texture;
        this.scene.environment = envMap;
        pmremGenerator.dispose();
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