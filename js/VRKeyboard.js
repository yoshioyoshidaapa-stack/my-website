// js/VRKeyboard.js
// 更新日時: 2026/01/30 16:00:00
export class VRKeyboard {
    constructor(scene, camera, THREE) {
        this.VERSION = 'VRKeyboard v1.0.5 - 2026/01/30 16:00';
        console.log('🎹', this.VERSION);
        
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
        
        // 更新フラグ（無限ループ防止）
        this.isUpdating = false;
        
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
            wa:'わ', wo:'を', n:'ん', nn:'ん',
            
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
            tya:'ちゃ', tyu:'ちゅ', tyo:'ちょ',  // ty系を追加
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
            this.recognition.maxAlternatives = 1;
            
            // イベントハンドラを一度だけ設定
            this.recognition.onresult = (event) => {
                console.log('✅ 音声認識結果を受信');
                
                const transcript = event.results[0][0].transcript;
                console.log('📝 認識されたテキスト:', transcript);
                
                // 認識したテキストを追加
                this.input += transcript;
                
                // 状態をリセット
                this.isRecording = false;
                this.requestUpdate();
            };
            
            this.recognition.onerror = (error) => {
                console.error('❌ 音声認識エラー:', error.error);
                
                // 状態をリセット
                this.isRecording = false;
                this.requestUpdate();
            };
            
            this.recognition.onstart = () => {
                console.log('🎙️ 音声認識が開始されました');
                this.isRecording = true;
                this.requestUpdate();
            };
            
            this.recognition.onend = () => {
                console.log('🛑 音声認識が終了しました');
                // 状態が既にリセットされていなければリセット
                if(this.isRecording) {
                    this.isRecording = false;
                    this.requestUpdate();
                }
            };
            
            console.log('✅ 音声認識を初期化しました');
        } else {
            console.warn('⚠️ このブラウザは音声認識に対応していません');
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
                this.recognition.abort();
                console.log('🛑 音声認識を中断しました');
            } catch(e) {
                console.warn('Recognition abort error:', e);
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
        this.currentTexture = new THREE.CanvasTexture(canvas);
        this.currentTexture.minFilter = THREE.LinearFilter;
        
        // メッシュ作成
        const mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(2.5, 1.25),
            new THREE.MeshBasicMaterial({
                map: this.currentTexture,
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
        
        console.log('✅ VRキーボードパネル作成完了');
    }
    
    // Canvas作成
    createCanvas() {
        console.log('🎨 Creating canvas with input:', this.input, 'romaji:', this.romajiBuffer, 'recording:', this.isRecording);
        
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
        ctx.textBaseline = 'middle';
        const displayText = this.input + this.romajiBuffer;
        
        console.log('💬 Display text:', displayText);
        
        // 録音中は「音声認識中...」表示
        if(this.isRecording) {
            ctx.fillStyle = '#ff5555';
            ctx.fillText('🎤 音声認識中...', 70, 110);
        } else {
            const text = displayText || 'ここに入力...';
            ctx.fillStyle = displayText ? '#fff' : '#888';
            ctx.fillText(text.substring(Math.max(0, text.length - 40)), 70, 110);
            console.log('📝 Drawing text:', text.substring(Math.max(0, text.length - 40)));
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
            // 各行の幅を正確に計算（スペースは2倍幅）
            let totalRowWidth = 0;
            row.forEach(key => {
                totalRowWidth += (key === 'スペース' ? keyWidth * 2 : keyWidth) + gap;
            });
            totalRowWidth -= gap;
            
            const startX = (1024 - totalRowWidth) / 2;
            
            let currentX = startX;
            row.forEach((key) => {
                const x = currentX;
                const y = startY + rowIdx * (keyHeight + gap);
                const w = key === 'スペース' ? keyWidth * 2 : keyWidth;
                
                // キー背景
                let bgColor = '#555';
                if(key === '完了') bgColor = '#4CAF50';
                else if(key === '削除') bgColor = '#f44336';
                else if(key === '🎤') {
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
                ctx.fillText(key, x + w / 2, y + keyHeight / 2);
                
                currentX += w + gap;
            });
        });
    }
    
    // キー押下
    pressKey(key) {
        console.log('🔑 Key pressed:', key);
        console.log('📝 Current input:', this.input);
        console.log('📝 Current romaji:', this.romajiBuffer);
        
        if(key === '🎤') {
            this.toggleVoiceInput();
            return;
        }
        
        if(key === '削除') {
            if(this.romajiBuffer.length > 0) {
                this.romajiBuffer = this.romajiBuffer.slice(0, -1);
            } else if(this.input.length > 0) {
                this.input = this.input.slice(0, -1);
            }
            console.log('✂️ After delete - input:', this.input, 'romaji:', this.romajiBuffer);
            this.requestUpdate();
            return;
        }
        
        if(key === 'スペース') {
            this.input += ' ';
            console.log('␣ After space - input:', this.input);
            this.requestUpdate();
            return;
        }
        
        if(key === '完了') {
            console.log('✅ Completing with input:', this.input);
            if(this.onComplete) {
                this.onComplete(this.input);
            }
            this.hide();
            return;
        }
        
        // 数字や記号はそのまま入力
        if(/[0-9。、ー\-]/.test(key)) {
            this.input += key;
            console.log('🔢 After number/symbol - input:', this.input);
            this.requestUpdate();
            return;
        }
        
        this.processRomaji(key.toLowerCase());
        console.log('🔤 After romaji - input:', this.input, 'romaji:', this.romajiBuffer);
        this.requestUpdate();
    }
    
    // 音声入力トグル
    toggleVoiceInput() {
        if(!this.recognition) {
            console.warn('⚠️ 音声認識が利用できません');
            return;
        }
        
        if(this.isRecording) {
            // 停止処理
            console.log('⏹️ 音声認識を停止します...');
            this.stopVoiceInput();
        } else {
            // 開始処理
            this.startVoiceInput();
        }
    }
    
    // 音声認識停止処理
    stopVoiceInput() {
        if(!this.recognition) {
            console.log('⚠️ 音声認識が存在しません');
            return;
        }
        
        if(!this.isRecording) {
            console.log('⚠️ 停止対象がありません');
            return;
        }
        
        try {
            // abort()を使用して即座に停止
            this.recognition.abort();
            console.log('✅ 音声認識を中断しました');
        } catch(e) {
            console.warn('⚠️ Recognition abort error:', e);
        }
        
        // 状態を即座にリセット
        this.isRecording = false;
        this.requestUpdate();
    }
    
    // 音声入力開始
    startVoiceInput() {
        if(!this.recognition) {
            console.warn('⚠️ 音声認識が利用できません');
            return;
        }
        
        if(this.isRecording) {
            console.warn('⚠️ 音声認識が既に実行中です');
            return;
        }
        
        console.log('🎤 音声認識を開始します...');
        
        // 音声認識を開始
        try {
            this.recognition.start();
            console.log('✨ recognition.start() が成功しました');
        } catch(e) {
            console.error('💥 recognition.start() でエラー:', e);
            this.isRecording = false;
            this.requestUpdate();
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
    
    // 更新リクエスト（無限ループ防止）
    requestUpdate() {
        if(this.isUpdating) {
            console.warn('⚠️ Already updating, skipping...');
            return;
        }
        
        this.isUpdating = true;
        
        // 即座に更新（requestAnimationFrameは使わない）
        this.updatePanel();
        
        // 次のフレームでフラグをリセット
        setTimeout(() => {
            this.isUpdating = false;
        }, 10);
    }
    
    // パネル更新
    updatePanel() {
        if(!this.panel) {
            console.warn('⚠️ Panel does not exist');
            return;
        }
        
        if(!this.currentTexture) {
            console.warn('⚠️ Texture does not exist');
            return;
        }
        
        try {
            console.log('🔄 Updating panel with input:', this.input, 'romaji:', this.romajiBuffer);
            
            // 新しいCanvasを作成
            const canvas = this.createCanvas();
            
            // テクスチャのimageを直接更新
            this.currentTexture.image = canvas;
            this.currentTexture.needsUpdate = true;
            
            console.log('✅ Panel updated successfully');
        } catch(e) {
            console.error('❌ updatePanel error:', e);
        }
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
        
        const keyWidth = 80;
        const keyHeight = 50;
        const gap = 10;
        const startY = 170;
        
        if(y > startY) {
            const relY = y - startY;
            const rowIdx = Math.floor(relY / (keyHeight + gap));
            
            if(rowIdx >= 0 && rowIdx < keys.length) {
                const row = keys[rowIdx];
                
                // 各行の開始位置を正確に計算（drawKeysと同じロジック）
                let totalRowWidth = 0;
                row.forEach(key => {
                    totalRowWidth += (key === 'スペース' ? keyWidth * 2 : keyWidth) + gap;
                });
                totalRowWidth -= gap;
                
                const startX = (1024 - totalRowWidth) / 2;
                const relX = x - startX;
                
                if(relX < 0) return null;
                
                // スペースキーの幅を考慮して当たり判定
                let currentX = 0;
                for(let i = 0; i < row.length; i++) {
                    const key = row[i];
                    const w = key === 'スペース' ? keyWidth * 2 : keyWidth;
                    
                    if(relX >= currentX && relX < currentX + w) {
                        return key;
                    }
                    
                    currentX += w + gap;
                }
            }
        }
        
        return null;
    }
    
    // 入力テキスト取得（デバッグ用）
    getInputText() {
        return this.input;
    }
    
    // 録音中かどうか取得（デバッグ用）
    getIsRecording() {
        return this.isRecording;
    }
}
