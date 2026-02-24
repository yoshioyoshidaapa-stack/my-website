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
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.01;
        this.renderer.physicallyCorrectLights = true;
        container.appendChild(this.renderer.domElement);

        // ライト
        this.setupLights();

        // 環境マップ（メタリック/PBR素材の反射用）
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
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        // メインの指向性ライト（太陽光）
        const directionalLight = new THREE.DirectionalLight(0xffffff, 2.0);
        directionalLight.position.set(5, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);

        // 補助光（影を柔らかくする）
        const fillLight = new THREE.DirectionalLight(0x8888ff, 0.5);
        fillLight.position.set(-5, 5, -5);
        this.scene.add(fillLight);

        // 半球光（自然な明暗のグラデーション）
        const hemiLight = new THREE.HemisphereLight(0x88ccff, 0x444422, 0.5);
        this.scene.add(hemiLight);
    }
    
    // 環境マップ設定（プロシージャル生成、HDRファイル不要）
    setupEnvironment() {
        const THREE = this.THREE;
        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        pmremGenerator.compileEquirectangularShader();

        // シンプルな環境シーンを作成
        const envScene = new THREE.Scene();

        // 空のグラデーション（上: 明るい青、下: 薄いグレー）
        const skyColor = new THREE.Color(0x88ccff);
        const groundColor = new THREE.Color(0x444444);
        const hemiLight = new THREE.HemisphereLight(skyColor, groundColor, 1.0);
        envScene.add(hemiLight);

        // 強めの方向性ライト（太陽光のハイライト用）
        const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
        sunLight.position.set(5, 10, 3);
        envScene.add(sunLight);

        // 反対側からの弱い補助光
        const fillLight = new THREE.DirectionalLight(0xaaccff, 0.5);
        fillLight.position.set(-3, 5, -5);
        envScene.add(fillLight);

        // 白い球体（環境反射の明るさを補助）
        const envSphere = new THREE.Mesh(
            new THREE.SphereGeometry(100, 16, 16),
            new THREE.MeshBasicMaterial({ color: 0x88aacc, side: THREE.BackSide })
        );
        envScene.add(envSphere);

        const envMap = pmremGenerator.fromScene(envScene, 0.04).texture;
        this.scene.environment = envMap;

        pmremGenerator.dispose();
        console.log('環境マップ設定完了');
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