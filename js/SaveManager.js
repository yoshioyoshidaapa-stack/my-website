// js/SaveManager.js
export class SaveManager {
    constructor(scene, memoManager, modelLoader) {
        this.scene = scene;
        this.memoManager = memoManager;
        this.modelLoader = modelLoader;
    }
    
    // シーンをセーブ
    async save() {
        const saveData = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            memos: this.saveMemos(),
            model: await this.saveModel()
        };
        
        const json = JSON.stringify(saveData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `vr-scene-${Date.now()}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        
        return true;
    }
    
    // メモをセーブ
    saveMemos() {
        const memos = this.memoManager.getAllMemos();
        return memos.map(memo => ({
            id: memo.id,
            text: memo.text,
            position: {
                x: memo.position.x,
                y: memo.position.y,
                z: memo.position.z
            },
            rotation: {
                x: memo.sprite.rotation.x,
                y: memo.sprite.rotation.y,
                z: memo.sprite.rotation.z
            }
        }));
    }
    
    // モデルをセーブ
    async saveModel() {
        const model = this.modelLoader.getCurrentModel();
        if(!model) return null;
        
        const modelData = {
            position: {
                x: model.position.x,
                y: model.position.y,
                z: model.position.z
            },
            rotation: {
                x: model.rotation.x,
                y: model.rotation.y,
                z: model.rotation.z
            },
            scale: {
                x: model.scale.x,
                y: model.scale.y,
                z: model.scale.z
            }
        };
        
        // ファイル入力から元のファイルを取得
        const fileInput = document.getElementById('fileInput');
        if(fileInput && fileInput.files && fileInput.files[0]) {
            const file = fileInput.files[0];
            const data = await this.fileToBase64(file);
            modelData.data = data;
            modelData.name = file.name;
            modelData.type = file.name.toLowerCase().split('.').pop();
        }
        
        return modelData;
    }
    
    // ファイルをBase64に変換
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
    
    // シーンをロード
    load(onProgress, onComplete, onError) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if(!file) return;
            
            try {
                const text = await this.readFileAsText(file);
                const saveData = JSON.parse(text);
                
                // メモをクリア
                this.memoManager.clear();
                
                // メモを復元
                if(saveData.memos) {
                    this.loadMemos(saveData.memos);
                }
                
                // モデルを復元
                if(saveData.model && saveData.model.data) {
                    await this.loadModel(saveData.model, onProgress);
                }
                
                if(onComplete) onComplete();
            } catch(error) {
                console.error('ロードエラー:', error);
                if(onError) onError(error);
            }
        };
        
        input.click();
    }
    
    // ファイルをテキストとして読み込み
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }
    
    // メモを復元
    loadMemos(memosData) {
        const THREE = this.memoManager.THREE;
        
        memosData.forEach(memoData => {
            const position = new THREE.Vector3(
                memoData.position.x,
                memoData.position.y,
                memoData.position.z
            );
            
            const id = this.memoManager.create(position, memoData.text);
            
            // 回転を復元
            const memo = this.memoManager.memos.find(m => m.id === id);
            if(memo && memo.sprite && memoData.rotation) {
                memo.sprite.rotation.set(
                    memoData.rotation.x,
                    memoData.rotation.y,
                    memoData.rotation.z
                );
            }
        });
    }
    
    // モデルを復元
    async loadModel(modelData, onProgress) {
        // Base64をバイナリに変換
        const base64 = modelData.data.split(',')[1];
        const binary = atob(base64);
        const array = new Uint8Array(binary.length);
        for(let i = 0; i < binary.length; i++) {
            array[i] = binary.charCodeAt(i);
        }
        const buffer = array.buffer;
        
        // ファイルオブジェクトを作成
        const blob = new Blob([buffer]);
        const file = new File([blob], modelData.name);
        
        // モデルを読み込み
        return new Promise((resolve, reject) => {
            this.modelLoader.loadFile(
                file,
                onProgress,
                (format) => {
                    // 位置・回転・スケールを復元
                    setTimeout(() => {
                        const model = this.modelLoader.getCurrentModel();
                        if(model) {
                            model.position.set(
                                modelData.position.x,
                                modelData.position.y,
                                modelData.position.z
                            );
                            model.rotation.set(
                                modelData.rotation.x,
                                modelData.rotation.y,
                                modelData.rotation.z
                            );
                            model.scale.set(
                                modelData.scale.x,
                                modelData.scale.y,
                                modelData.scale.z
                            );
                            
                            // UIも更新
                            const scaleSlider = document.getElementById('scaleSlider');
                            const scaleValue = document.getElementById('scaleValue');
                            if(scaleSlider) scaleSlider.value = modelData.scale.x;
                            if(scaleValue) scaleValue.textContent = `${modelData.scale.x.toFixed(1)}x`;
                        }
                        resolve();
                    }, 500);
                },
                reject
            );
        });
    }
}