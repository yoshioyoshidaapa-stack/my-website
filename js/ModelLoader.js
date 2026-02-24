// js/ModelLoader.js
export class ModelLoader {
    constructor(scene, THREE) {
        this.scene = scene;
        this.THREE = THREE;
        this.currentModel = null;
        this.currentScale = 1.0;
        
        // ローダー初期化（必要に応じて）
        this.gltfLoader = null;
        this.objLoader = null;
        this.stlLoader = null;
        this.fbxLoader = null;
    }
    
    // ファイル読み込み
    loadFile(file, onProgress, onComplete, onError) {
        const ext = file.name.toLowerCase().split('.').pop();
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const buffer = event.target.result;
            
            switch(ext) {
                case 'glb':
                case 'gltf':
                    this.loadGLTF(buffer, onComplete, onError);
                    break;
                case 'obj':
                    this.loadOBJ(buffer, onComplete, onError);
                    break;
                case 'stl':
                    this.loadSTL(buffer, onComplete, onError);
                    break;
                case 'fbx':
                    this.loadFBX(buffer, onComplete, onError);
                    break;
                default:
                    if(onError) onError(new Error('未対応のファイル形式'));
            }
        };
        
        reader.onerror = () => {
            if(onError) onError(new Error('ファイル読み込みエラー'));
        };
        
        reader.readAsArrayBuffer(file);
    }
    
    // GLTF/GLB読み込み
    loadGLTF(buffer, onComplete, onError) {
        const THREE = this.THREE;
        
        if(!this.gltfLoader) {
            this.gltfLoader = new window.GLTFLoader();
        }
        
        this.gltfLoader.parse(buffer, '', (gltf) => {
            this.addModelToScene(gltf.scene, 'GLTF');
            if(onComplete) onComplete('GLTF');
        }, (error) => {
            console.error('GLTF読み込みエラー:', error);
            if(onError) onError(error);
        });
    }
    
    // OBJ読み込み
    loadOBJ(buffer, onComplete, onError) {
        try {
            const THREE = this.THREE;
            
            if(!this.objLoader) {
                this.objLoader = new THREE.OBJLoader();
            }
            
            const text = new TextDecoder().decode(buffer);
            const obj = this.objLoader.parse(text);
            
            this.addModelToScene(obj, 'OBJ');
            if(onComplete) onComplete('OBJ');
        } catch(error) {
            console.error('OBJ読み込みエラー:', error);
            if(onError) onError(error);
        }
    }
    
    // STL読み込み
    loadSTL(buffer, onComplete, onError) {
        try {
            const THREE = this.THREE;
            
            if(!this.stlLoader) {
                this.stlLoader = new THREE.STLLoader();
            }
            
            const geometry = this.stlLoader.parse(buffer);
            const material = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
            const mesh = new THREE.Mesh(geometry, material);
            
            this.addModelToScene(mesh, 'STL');
            if(onComplete) onComplete('STL');
        } catch(error) {
            console.error('STL読み込みエラー:', error);
            if(onError) onError(error);
        }
    }
    
    // FBX読み込み
    loadFBX(buffer, onComplete, onError) {
        try {
            const THREE = this.THREE;
            
            if(!this.fbxLoader) {
                this.fbxLoader = new THREE.FBXLoader();
            }
            
            this.fbxLoader.parse(buffer, '', (fbx) => {
                this.addModelToScene(fbx, 'FBX');
                if(onComplete) onComplete('FBX');
            }, (error) => {
                console.error('FBX読み込みエラー:', error);
                if(onError) onError(error);
            });
        } catch(error) {
            console.error('FBX読み込みエラー:', error);
            if(onError) onError(error);
        }
    }
    
    // シーンにモデル追加
    addModelToScene(model, format) {
        const THREE = this.THREE;
        
        // 既存モデルを削除
        this.clearModel();
        
        model.name = 'loadedModel';
        
        // マテリアル設定
        model.traverse((node) => {
            if(node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
                if(!node.material) {
                    node.material = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
                }
            }
        });
        
        // 中心に配置
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.set(-center.x, -box.min.y, -center.z);
        
        this.scene.add(model);
        this.currentModel = model;
        
        console.log(`${format}モデル読み込み完了`);
    }
    
    // モデル削除
    clearModel() {
        if(this.currentModel) {
            this.scene.remove(this.currentModel);
            this.currentModel = null;
        }
    }
    
    // スケール変更
    setScale(scale) {
        if(this.currentModel) {
            this.currentModel.scale.set(scale, scale, scale);
            this.currentScale = scale;
        }
    }
    
    // 現在のモデル取得
    getCurrentModel() {
        return this.currentModel;
    }
    
    // スケール取得
    getScale() {
        return this.currentScale;
    }
}