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
            version: '1.1',
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
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // ダウンロード開始前に解放されないよう少し待つ
        setTimeout(() => URL.revokeObjectURL(url), 1000);

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

        // 修正: ファイル選択欄ではなく「今表示しているモデルの元ファイル」を保存する
        // （セーブデータからロードしたモデルも、もう一度セーブできるようにするため）
        const file = this.modelLoader.getCurrentFile();
        if(file) {
            modelData.data = await this.fileToBase64(file);
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

                if(!saveData || typeof saveData !== 'object') {
                    throw new Error('セーブデータの形式が正しくありません');
                }

                // メモをクリア
                this.memoManager.clear();

                // メモを復元
                if(Array.isArray(saveData.memos)) {
                    this.loadMemos(saveData.memos);
                }

                // モデルを復元
                if(saveData.model && saveData.model.data) {
                    await this.loadModel(saveData.model, onProgress, saveData.version);
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
            if(!memoData || !memoData.position || typeof memoData.text !== 'string') return;

            const position = new THREE.Vector3(
                Number(memoData.position.x) || 0,
                Number(memoData.position.y) || 0,
                Number(memoData.position.z) || 0
            );

            const id = this.memoManager.create(position, memoData.text);

            // 回転を復元
            const memo = this.memoManager.memos.find(m => m.id === id);
            if(memo && memo.sprite && memoData.rotation) {
                memo.sprite.rotation.set(
                    Number(memoData.rotation.x) || 0,
                    Number(memoData.rotation.y) || 0,
                    Number(memoData.rotation.z) || 0
                );
            }
        });
    }

    // モデルを復元
    async loadModel(modelData, onProgress, version) {
        // Base64をバイナリに変換
        const base64 = modelData.data.split(',')[1];
        const binary = atob(base64);
        const array = new Uint8Array(binary.length);
        for(let i = 0; i < binary.length; i++) {
            array[i] = binary.charCodeAt(i);
        }

        // ファイルオブジェクトを作成（名前を引き継ぐので再セーブも可能）
        const file = new File([array], modelData.name || `model.${modelData.type || 'glb'}`);

        // モデルを読み込み
        return new Promise((resolve, reject) => {
            this.modelLoader.loadFile(
                file,
                onProgress,
                () => {
                    const model = this.modelLoader.getCurrentModel();
                    if(model) {
                        // 旧形式(1.0)の位置は「自動中央寄せ」の値なので復元しない
                        // （新形式では中央寄せは内側で自動的に行われる）
                        if(version !== '1.0' && modelData.position) {
                            model.position.set(
                                modelData.position.x,
                                modelData.position.y,
                                modelData.position.z
                            );
                        }
                        if(modelData.rotation) {
                            model.rotation.set(
                                modelData.rotation.x,
                                modelData.rotation.y,
                                modelData.rotation.z
                            );
                        }
                        if(modelData.scale) {
                            const s = Number(modelData.scale.x) || 1;
                            this.modelLoader.setScale(s);

                            // UIも更新
                            const scaleSlider = document.getElementById('scaleSlider');
                            const scaleValue = document.getElementById('scaleValue');
                            if(scaleSlider) scaleSlider.value = s;
                            if(scaleValue) scaleValue.textContent = `${s.toFixed(1)}x`;
                        }
                    }
                    resolve();
                },
                reject
            );
        });
    }
}
