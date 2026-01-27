// js/MemoManager.js
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
            if(sprite) this.scene.remove(sprite);
            this.memos.splice(index, 1);
        }
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
    
    // テキストを折り返し
    wrapText(ctx, text, maxWidth) {
        const lines = [];
        text.split('\n').forEach(para => {
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
            lines.push(line.trim());
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
            if(memo.sprite) this.scene.remove(memo.sprite);
        });
        this.memos = [];
    }
}