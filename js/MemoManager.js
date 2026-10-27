// js/MemoManager.js
import { disposeObject } from './utils.js';

export class MemoManager {
    constructor(scene, camera, THREE) {
        this.scene = scene;
        this.camera = camera;
        this.THREE = THREE;
        this.memos = [];
        this.counter = 0;
        this.recognition = null;
        this.isRecording = false;
        
        this.initSpeechRecognition();
    }
    
    // 音声認識初期化
    initSpeechRecognition() {
        if('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SR();
            this.recognition.lang = 'ja-JP';
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
        }
    }
    
    // メモ作成
    create(position, text) {
        const id = this.counter++;
        const THREE = this.THREE;
        
        // Canvas作成
        const canvas = this.createCanvas(text);
        
        // テクスチャ作成
        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        
        // メッシュ作成
        const aspect = canvas.height / canvas.width;
        const baseWidth = 0.6;
        const baseHeight = baseWidth * aspect;
        
        const geometry = new THREE.PlaneGeometry(baseWidth, baseHeight);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide,
            depthTest: false,
            depthWrite: false
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        
        // カメラの方を向かせる
        const lookTarget = new THREE.Vector3();
        this.camera.getWorldPosition(lookTarget);
        mesh.lookAt(lookTarget);
        
        mesh.renderOrder = 9999;
        mesh.name = `memo_${id}`;
        mesh.userData = {
            text: text,
            aspect: aspect,
            isMemo: true
        };
        
        this.scene.add(mesh);
        
        // 配列に保存
        this.memos.push({
            id: id,
            text: text,
            position: position.clone(),
            sprite: mesh
        });
        
        return id;
    }
    
    // メモ削除
    delete(id) {
        const index = this.memos.findIndex(m => m.id === id);
        if(index !== -1) {
            const sprite = this.memos[index].sprite;
            if(sprite) disposeObject(sprite);  // 画面から消す＋メモリ解放
            this.memos.splice(index, 1);
        }
    }
    
    // メモ更新
    update(id, newText) {
        const memo = this.memos.find(m => m.id === id);
        if(!memo) {
            console.warn('❌ メモが見つかりません:', id);
            return false;
        }
        
        console.log('🔍 メモを更新中:', id, 'テキスト:', newText);
        
        // テキストを更新
        memo.text = newText;
        
        // 新しいCanvasを作成
        const canvas = this.createCanvas(newText);
        const aspect = canvas.height / canvas.width;
        const baseWidth = 0.6;
        const baseHeight = baseWidth * aspect;
        
        // メッシュのテクスチャとジオメトリを更新
        if(memo.sprite) {
            const THREE = this.THREE;
            
            // 古いマテリアルのテクスチャを破棄
            if(memo.sprite.material.map) {
                memo.sprite.material.map.dispose();
            }
            
            // 新しいテクスチャを作成
            const newTexture = new THREE.CanvasTexture(canvas);
            newTexture.minFilter = THREE.LinearFilter;
            memo.sprite.material.map = newTexture;
            memo.sprite.material.needsUpdate = true;
            
            // 古いジオメトリを破棄
            const oldGeometry = memo.sprite.geometry;
            
            // 新しいジオメトリを作成（サイズが変わる可能性があるため）
            const newGeometry = new THREE.PlaneGeometry(baseWidth, baseHeight);
            memo.sprite.geometry = newGeometry;
            
            // 古いジオメトリを破棄（置き換え後に）
            if(oldGeometry) {
                oldGeometry.dispose();
            }
            
            // userDataも更新
            memo.sprite.userData.text = newText;
            memo.sprite.userData.aspect = aspect;
            
            console.log('✅ メモを更新しました:', id, 'サイズ:', baseWidth, 'x', baseHeight);
            return true;
        }
        
        console.warn('❌ スプライトが見つかりません:', id);
        return false;
    }
    
    // Canvas作成
    createCanvas(text) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 512;
        
        // テキストを行に分割
        ctx.font = 'bold 32px Arial';
        const lines = this.wrapText(ctx, text, 472);
        canvas.height = (lines.length * 40) + 40;
        
        // 背景
        ctx.fillStyle = '#ffd93d';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // テキスト描画
        ctx.fillStyle = '#000';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        
        let y = 20;
        lines.forEach(line => {
            ctx.fillText(line, 256, y);
            y += 40;
        });
        
        return canvas;
    }
    
    // テキストを折り返し（日本語対応）
    wrapText(ctx, text, maxWidth) {
        const lines = [];
        
        // 改行で分割
        const paragraphs = text.split('\n');
        
        paragraphs.forEach(para => {
            if(para === '') {
                lines.push('');  // 空行を保持
                return;
            }
            
            // 日本語が含まれているか確認
            const hasJapanese = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf]/.test(para);
            
            if(hasJapanese) {
                // 日本語の場合：文字単位で折り返し
                let line = '';
                for(let i = 0; i < para.length; i++) {
                    const char = para[i];
                    const test = line + char;
                    if(ctx.measureText(test).width > maxWidth && line !== '') {
                        lines.push(line);
                        line = char;
                    } else {
                        line = test;
                    }
                }
                if(line) lines.push(line);
            } else {
                // 英語の場合：単語単位で折り返し
                const words = para.split(' ');
                let line = '';
                words.forEach(word => {
                    const test = line + word + ' ';
                    if(ctx.measureText(test).width > maxWidth && line !== '') {
                        lines.push(line.trim());
                        line = word + ' ';
                    } else {
                        line = test;
                    }
                });
                if(line) lines.push(line.trim());
            }
        });
        
        return lines;
    }
    
    // 音声入力開始
    startVoiceInput(position, callback) {
        if(!this.recognition || this.isRecording) return;
        
        this.isRecording = true;
        
        this.recognition.onresult = (event) => {
            this.isRecording = false;
            const transcript = event.results[0][0].transcript;
            const id = this.create(position, transcript);
            if(callback) callback(id, transcript);
        };
        
        this.recognition.onerror = (error) => {
            console.error('音声認識エラー:', error);
            this.isRecording = false;
        };
        
        try {
            this.recognition.start();
        } catch(e) {
            console.warn('音声認識開始エラー:', e);
            this.isRecording = false;
        }
    }
    
    // 全メモ取得
    getAllMemos() {
        return this.memos;
    }
    
    // メモをクリア
    clear() {
        this.memos.forEach(memo => {
            if(memo.sprite) disposeObject(memo.sprite);  // 画面から消す＋メモリ解放
        });
        this.memos = [];
    }
}
