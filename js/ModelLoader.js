// js/ModelLoader.js
import { disposeObject } from './utils.js';

export class ModelLoader {
    constructor(scene, THREE) {
        this.scene = scene;
        this.THREE = THREE;

        // currentModel は「土台（pivot）」グループ。
        // 実際のモデルはその子として、底面中心が土台の原点に来るように置く。
        // こうすると拡大・縮小しても床に沈んだり浮いたりしない。
        this.currentModel = null;
        this.currentScale = 1.0;

        // 現在表示中のモデルの元ファイル（セーブ時に使う）
        this.currentFile = null;

        // ローダー（必要になった時に作成）
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

            // 読み込み成功時に元ファイルを記憶してから完了を通知
            const done = (format) => {
                this.currentFile = file;
                if(onComplete) onComplete(format);
            };

            switch(ext) {
                case 'glb':
                case 'gltf':
                    this.loadGLTF(buffer, done, onError);
                    break;
                case 'obj':
                    this.loadOBJ(buffer, done, onError);
                    break;
                case 'stl':
                    this.loadSTL(buffer, done, onError);
                    break;
                case 'fbx':
                    this.loadFBX(buffer, done, onError);
                    break;
                default:
                    if(onError) onError(new Error('未対応のファイル形式です（GLB / GLTF / OBJ / STL / FBX に対応）'));
            }
        };

        reader.onerror = () => {
            if(onError) onError(new Error('ファイル読み込みエラー'));
        };

        reader.readAsArrayBuffer(file);
    }

    // GLTF/GLB読み込み
    loadGLTF(buffer, onComplete, onError) {
        try {
            if(!this.gltfLoader) {
                this.gltfLoader = new window.GLTFLoader();
            }

            this.gltfLoader.parse(buffer, '', (gltf) => {
                this.addModelToScene(gltf.scene, 'GLTF');
                if(onComplete) onComplete('GLTF');
            }, (error) => {
                console.error('GLTF読み込みエラー:', error);
                if(onError) onError(this._wrapGLTFError(error));
            });
        } catch(error) {
            console.error('GLTF読み込みエラー:', error);
            if(onError) onError(this._wrapGLTFError(error));
        }
    }

    // .gltf（別ファイル参照あり）の場合に分かりやすいメッセージにする
    _wrapGLTFError(error) {
        const msg = (error && error.message) || String(error);
        return new Error(msg + '（.gltf でテクスチャ等が別ファイルの場合は読み込めません。GLB形式で書き出してください）');
    }

    // OBJ読み込み
    loadOBJ(buffer, onComplete, onError) {
        try {
            // 修正: THREE.OBJLoader ではなく window.OBJLoader を使う
            if(!this.objLoader) {
                this.objLoader = new window.OBJLoader();
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

            // 修正: THREE.STLLoader ではなく window.STLLoader を使う
            if(!this.stlLoader) {
                this.stlLoader = new window.STLLoader();
            }

            const geometry = this.stlLoader.parse(buffer);
            if(!geometry.attributes.normal) {
                geometry.computeVertexNormals();
            }
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
            // 修正: THREE.FBXLoader ではなく window.FBXLoader を使う
            if(!this.fbxLoader) {
                this.fbxLoader = new window.FBXLoader();
            }

            // 修正: FBXLoader.parse は結果をそのまま返す（コールバック形式ではない）
            const fbx = this.fbxLoader.parse(buffer, '');

            this.addModelToScene(fbx, 'FBX');
            if(onComplete) onComplete('FBX');
        } catch(error) {
            console.error('FBX読み込みエラー:', error);
            if(onError) onError(error);
        }
    }

    // シーンにモデル追加
    addModelToScene(model, format) {
        const THREE = this.THREE;

        // 既存モデルを削除（メモリも解放）
        this.clearModel();

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

        // モデルの底面中心が原点に来るようにずらす
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.set(-center.x, -box.min.y, -center.z);

        // 土台（pivot）に載せる。拡大縮小・セーブはこの土台に対して行う
        const pivot = new THREE.Group();
        pivot.name = 'loadedModel';
        pivot.add(model);
        pivot.scale.setScalar(this.currentScale);

        this.scene.add(pivot);
        this.currentModel = pivot;

        console.log(`${format}モデル読み込み完了`);
    }

    // モデル削除（メモリも解放）
    clearModel() {
        if(this.currentModel) {
            disposeObject(this.currentModel);
            this.currentModel = null;
        }
        this.currentFile = null;
    }

    // スケール変更
    setScale(scale) {
        this.currentScale = scale;
        if(this.currentModel) {
            this.currentModel.scale.set(scale, scale, scale);
        }
    }

    // 現在のモデル（土台）取得
    getCurrentModel() {
        return this.currentModel;
    }

    // 現在のモデルの元ファイル取得
    getCurrentFile() {
        return this.currentFile;
    }

    // スケール取得
    getScale() {
        return this.currentScale;
    }
}
