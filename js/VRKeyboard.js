// js/VRKeyboard.js
export class VRKeyboard {
    constructor(scene, camera, THREE) {
        this.scene = scene;
        this.camera = camera;
        this.THREE = THREE;
        this.panel = null;
        this.input = '';
        this.romajiBuffer = '';
        this.isActive = false;
        this.onComplete = null;
        
        // 音声認識
        this.recognition = null;
        this.isRecording = false;
        this.initSpeechRecognition();
        
        // ローマ字変換テーブル
        this.ROMAJI_TABLE = {
    // 基本
    a:'あ', i:'い', u:'う', e:'え', o:'お',
    ka:'か', ki:'き', ku:'く', ke:'け', ko:'こ',
    sa:'さ', si:'し', shi:'し', su:'す', se:'せ', so:'そ',
    ta:'た', ti:'ち', chi:'ち', tu:'つ', tsu:'つ', te:'て', to:'と',
    na:'な', ni:'に', nu:'ぬ', ne:'ね', no:'の',
    ha:'は', hi:'ひ', hu:'ふ', fu:'ふ', he:'へ', ho:'ほ',
    ma:'ま', mi:'み', mu:'む', me:'め', mo:'も',
    ya:'や', yu:'ゆ', yo:'よ',
    ra:'ら', ri:'り', ru:'る', re:'れ', ro:'ろ',
    wa:'わ', wo:'を', n:'ん',
    
    // 濁音
    ga:'が', gi:'ぎ', gu:'ぐ', ge:'げ', go:'ご',
    za:'ざ', zi:'じ', ji:'じ', zu:'ず', ze:'ぜ', zo:'ぞ',
    da:'だ', di:'ぢ', du:'づ', de:'で', do:'ど',
    ba:'ば', bi:'び', bu:'ぶ', be:'べ', bo:'ぼ',
    
    // 半濁音
    pa:'ぱ', pi:'ぴ', pu:'ぷ', pe:'ぺ', po:'ぽ',
    
    // 拗音
    kya:'きゃ', kyu:'きゅ', kyo:'きょ',
    sha:'しゃ', shu:'しゅ', sho:'しょ',
    cha:'ちゃ', chu:'ちゅ', cho:'ちょ',
    nya:'にゃ', nyu:'にゅ', nyo:'にょ',
    hya:'ひゃ', hyu:'ひゅ', hyo:'ひょ',
    mya:'みゃ', myu:'みゅ', myo:'みょ',
    rya:'りゃ', ryu:'りゅ', ryo:'りょ',
    gya:'ぎゃ', gyu:'ぎゅ', gyo:'ぎょ',
    bya:'びゃ', byu:'びゅ', byo:'びょ',
    pya:'ぴゃ', pyu:'ぴゅ', pyo:'ぴょ',
    
    // v系
    vu:'ゔ',
    va:'ゔぁ', vi:'ゔぃ', ve:'ゔぇ', vo:'ゔぉ',
    
    // ファ行
    fa:'ふぁ', fi:'ふぃ', fe:'ふぇ', fo:'ふぉ',
    
    // ティ、ディ
    thi:'てぃ', dhi:'でぃ',
    
    // ウィ、ウェ、ウォ
    wi:'うぃ', we:'うぇ', who:'うぉ',
    
    // 小文字
    la:'ぁ', li:'ぃ', lu:'ぅ', le:'ぇ', lo:'ぉ',
    xa:'ぁ', xi:'ぃ', xu:'ぅ', xe:'ぇ', xo:'ぉ',
    lya:'ゃ', lyu:'ゅ', lyo:'ょ',
    xya:'ゃ', xyu:'ゅ', xyo:'ょ',
    ltu:'っ', xtu:'っ',
    
    '-':'ー'
};
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
    
    // キーボード表示
    show(onComplete) {
        this.input = '';
        this.romajiBuffer = '';
        this.isActive = true;
        this.onComplete = onComplete;
        
        this.createPanel();
    }
    
    // キーボード非表示
    hide() {
        // 録音中なら停止
        if(this.isRecording && this.recognition) {
            try {
                this.recognition.stop();
            } catch(e) {
                console.warn('Recognition stop error:', e);
            }
            this.isRecording = false;
        }
        
        if(this.panel) {
            this.scene.remove(this.panel);
            this.panel = null;
        }
        this.isActive = false;
        this.input = '';
        this.romajiBuffer = '';
    }
    
    // パネル作成
    createPanel() {
        const THREE = this.THREE;
        const panel = new THREE.Group();
        panel.name = 'vrKeyboard';
        
        // Canvas作成
        const canvas = this.createCanvas();
        const texture = new THREE.CanvasTexture(canvas);
        
        // メッシュ作成
        const mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(2.5, 1.25),
            new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                side: THREE.DoubleSide
            })
        );
        panel.add(mesh);
        
        // カメラの前に配置
        const cameraWorldPos = new THREE.Vector3();
        this.camera.getWorldPosition(cameraWorldPos);
        const cameraWorldDir = new THREE.Vector3();
        this.camera.getWorldDirection(cameraWorldDir);
        
        panel.position.copy(cameraWorldPos).add(cameraWorldDir.multiplyScalar(2));
        panel.lookAt(cameraWorldPos);
        panel.renderOrder = 10000;
        
        this.scene.add(panel);
        this.panel = panel;
    }
    
    // Canvas作成
    createCanvas() {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // 背景
        ctx.fillStyle = 'rgba(0,0,0,0.95)';
        ctx.fillRect(0, 0, 1024, 512);
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 4;
        ctx.strokeRect(0, 0, 1024, 512);
        
        // タイトル
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('メモ入力', 512, 50);
        
        // 入力欄
        ctx.fillStyle = '#333';
        ctx.fillRect(50, 80, 924, 60);
        
        // 録音中は赤く光る
        if(this.isRecording) {
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 4;
        } else {
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 2;
        }
        ctx.strokeRect(50, 80, 924, 60);
        
        // 入力テキスト表示
        ctx.fillStyle = '#fff';
        ctx.font = '28px Arial';
        ctx.textAlign = 'left';
        const displayText = this.input + this.romajiBuffer;
        
        // 録音中は「音声認識中...」表示
        if(this.isRecording) {
            ctx.fillStyle = '#ff5555';
            ctx.fillText('🎤 音声認識中...', 70, 120);
        } else {
            ctx.fillText(displayText.substring(Math.max(0, displayText.length - 30)) || 'ここに入力...', 70, 120);
        }
        
        // キーボードキー
        this.drawKeys(ctx);
        
        return canvas;
    }
    
    // キー描画
    drawKeys(ctx) {
        const keys = [
            ['1','2','3','4','5','6','7','8','9','0'],
            ['q','w','e','r','t','y','u','i','o','p'],
            ['a','s','d','f','g','h','j','k','l'],
            ['z','x','c','v','b','n','m'],
            ['-','。','、','🎤','削除','スペース','完了']
        ];
        
        const keyWidth = 80;
        const keyHeight = 50;
        const startY = 170;
        const gap = 10;
        
        keys.forEach((row, rowIdx) => {
            const rowWidth = row.length * (keyWidth + gap) - gap;
            const startX = (1024 - rowWidth) / 2;
            
            row.forEach((key, colIdx) => {
                const x = startX + colIdx * (keyWidth + gap);
                const y = startY + rowIdx * (keyHeight + gap);
                let w = keyWidth;
                
                // スペースは2倍幅
                if(key === 'スペース') w = keyWidth * 2;
                
                // キー背景
                let bgColor = '#555';
                if(key === '完了') bgColor = '#4CAF50';
                else if(key === '削除') bgColor = '#f44336';
                else if(key === '🎤') {
                    // 録音中は赤く点滅
                    bgColor = this.isRecording ? '#ff0000' : '#9C27B0';
                }
                
                ctx.fillStyle = bgColor;
                ctx.fillRect(x, y, w, keyHeight);
                ctx.strokeStyle = '#888';
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, w, keyHeight);
                
                // キーテキスト
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 24px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(key, x + w/2, y + keyHeight/2);
            });
        });
    }
    
    // キー入力処理
    handleInput(key) {
        // 🎤ボタン処理
        if(key === '🎤') {
            this.toggleVoiceInput();
            return;
        }
        
        if(key === '削除') {
            if(this.romajiBuffer.length) {
                this.romajiBuffer = this.romajiBuffer.slice(0, -1);
            } else {
                this.input = this.input.slice(0, -1);
            }
            this.updatePanel();
            return;
        }
        
        if(key === 'スペース') {
            this.input += ' ';
            this.updatePanel();
            return;
        }
        
        if(key === '完了') {
            if(this.onComplete) {
                this.onComplete(this.input);
            }
            this.hide();
            return;
        }
        
        // 数字や記号はそのまま入力
        if(/[0-9。、ー\-]/.test(key)) {
            this.input += key;
            this.updatePanel();
            return;
        }
        
        this.processRomaji(key.toLowerCase());
        this.updatePanel();
    }
    
    // 音声入力トグル
    toggleVoiceInput() {
        if(!this.recognition) {
            console.warn('音声認識が利用できません');
            return;
        }
        
        if(this.isRecording) {
            // 停止
            try {
                this.recognition.stop();
            } catch(e) {
                console.warn('Recognition stop error:', e);
            }
            this.isRecording = false;
            this.updatePanel();
        } else {
            // 開始
            this.startVoiceInput();
        }
    }
    
    // 音声入力開始
    startVoiceInput() {
        if(!this.recognition || this.isRecording) return;
        
        this.isRecording = true;
        this.updatePanel();
        
        this.recognition.onresult = (event) => {
            this.isRecording = false;
            const transcript = event.results[0][0].transcript;
            
            // 認識したテキストを追加
            this.input += transcript;
            this.updatePanel();
            
            console.log('音声認識結果:', transcript);
        };
        
        this.recognition.onerror = (error) => {
            this.isRecording = false;
            this.updatePanel();
            
            if(error.error === 'no-speech') {
                console.log('音声入力：タイムアウト');
            } else if(error.error === 'not-allowed') {
                console.error('音声入力：マイクの許可が必要です');
            } else {
                console.error('音声認識エラー:', error.error);
            }
        };
        
        this.recognition.onend = () => {
            this.isRecording = false;
            this.updatePanel();
        };
        
        try {
            this.recognition.start();
            console.log('音声認識開始');
        } catch(e) {
            console.warn('Recognition start error:', e);
            this.isRecording = false;
            this.updatePanel();
        }
    }
    
    // ローマ字処理
    processRomaji(char) {
        this.romajiBuffer += char;
        
        // 'nn' は「ん」
        if(this.romajiBuffer === 'nn') {
            this.input += 'ん';
            this.romajiBuffer = '';
            return;
        }
        
        // 促音変換
        if(this.romajiBuffer.length >= 2) {
            const last2 = this.romajiBuffer.slice(-2);
            if(last2[0] === last2[1] && /[bcdfghjklmpqrstvwxyz]/.test(last2[0]) && last2[0] !== 'n') {
                this.input += 'っ';
                this.romajiBuffer = this.romajiBuffer.slice(-1);
            }
        }
        
        // テーブルから変換
        for(let len = 3; len > 0; len--) {
            const part = this.romajiBuffer.slice(-len);
            if(this.ROMAJI_TABLE[part]) {
                this.input += this.ROMAJI_TABLE[part];
                this.romajiBuffer = '';
                break;
            }
        }
    }
    
    // パネル更新
    updatePanel() {
        if(!this.panel) return;
        
        const mesh = this.panel.children[0];
        const canvas = this.createCanvas();
        mesh.material.map.image = canvas;
        mesh.material.map.needsUpdate = true;
    }
    
    // レイキャストでキー検出
    detectKey(raycaster) {
        if(!this.panel || !this.isActive) return null;
        
        const hits = raycaster.intersectObject(this.panel.children[0], true);
        if(hits.length === 0) return null;
        
        const uv = hits[0].uv;
        const x = uv.x * 1024;
        const y = (1 - uv.y) * 512;
        
        const keys = [
            ['1','2','3','4','5','6','7','8','9','0'],
            ['q','w','e','r','t','y','u','i','o','p'],
            ['a','s','d','f','g','h','j','k','l'],
            ['z','x','c','v','b','n','m'],
            ['-','。','、','🎤','削除','スペース','完了']
        ];
        
        if(y > 170) {
            const relY = y - 170;
            const rowIdx = Math.floor(relY / 60);
            if(rowIdx >= 0 && rowIdx < keys.length) {
                const row = keys[rowIdx];
                const rowWidth = row.length * 90 - 10;
                const startX = (1024 - rowWidth) / 2;
                const relX = x - startX;
                const colIdx = Math.floor(relX / 90);
                if(colIdx >= 0 && colIdx < row.length) {
                    return row[colIdx];
                }
            }
        }
        
        return null;
    }
}
