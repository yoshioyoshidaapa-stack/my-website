// js/VRKeyboard.js
// 更新日時: 2026/01/30 17:35:00
export class VRKeyboard {
    constructor(scene, camera, THREE, memoManager = null) {
        this.VERSION = 'VRKeyboard v2.2.1 - 2026/01/30 17:35';
        console.log('🎹', this.VERSION);
        
        this.scene = scene;
        this.camera = camera;
        this.THREE = THREE;
        this.memoManager = memoManager;  // メモマネージャーの参照を追加
        
        // デバッグ：メモマネージャーが渡っているか確認
        console.log('📋 MemoManager:', this.memoManager ? '✅ 設定済み' : '❌ null');
        if(this.memoManager) {
            console.log('📋 MemoManager memos:', this.memoManager.getAllMemos ? this.memoManager.getAllMemos().length : 'メソッドなし');
        }
        
        this.panel = null;
        this.input = '';
        this.romajiBuffer = '';
        this.isActive = false;
        this.onComplete = null;
        
        // カーソル位置
        this.cursorPosition = 0;  // 文字列内のカーソル位置
        this.inputScrollOffset = 0;  // 入力欄のスクロール位置（行数）
        
        // メモリスト表示モード
        this.showMemoList = false;
        this.selectedMemoIndex = -1;
        this.memoListScrollOffset = 0;  // スクロール位置
        
        // 編集モード
        this.editingMemoId = null;  // 編集中のメモID
        
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
            wa:'わ', wo:'を', nn:'ん',  // nを削除、nnのみ残す
            
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
        this.cursorPosition = 0;
        this.inputScrollOffset = 0;
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
        this.editingMemoId = null;  // 編集モードリセット
        this.showMemoList = false;
        this.selectedMemoIndex = -1;
        this.memoListScrollOffset = 0;  // スクロール位置リセット
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
        console.log('🎨 Creating canvas with input:', this.input, 'romaji:', this.romajiBuffer, 'recording:', this.isRecording, 'showMemoList:', this.showMemoList);
        
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
        
        // メモリストモードの場合
        if(this.showMemoList) {
            this.drawMemoList(ctx);
            return canvas;
        }
        
        // 通常のキーボードモード
        // タイトル
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.editingMemoId ? 'メモ編集' : 'メモ入力', 512, 50);
        
        // 入力欄を拡大（3行→5行）
        ctx.fillStyle = '#333';
        ctx.fillRect(50, 80, 924, 80);  // 高さを60→80に
        
        // 録音中は赤く光る
        if(this.isRecording) {
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 4;
        } else {
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 2;
        }
        ctx.strokeRect(50, 80, 924, 80);
        
        // 入力テキスト表示（スクロール対応、カーソル表示）
        ctx.fillStyle = '#fff';
        ctx.font = '20px Arial';  // フォントサイズを少し小さく
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        const displayText = this.input + this.romajiBuffer;
        
        console.log('💬 Display text:', displayText, 'cursor:', this.cursorPosition);
        
        // 録音中は「音声認識中...」表示
        if(this.isRecording) {
            ctx.fillStyle = '#ff5555';
            ctx.fillText('🎤 音声認識中...', 70, 95);
        } else {
            const text = displayText || 'ここに入力...';
            ctx.fillStyle = displayText ? '#fff' : '#888';
            
            // 改行で分割
            const lines = text.split('\n');
            const maxDisplayLines = 3;  // 最大3行表示
            
            // スクロール位置を計算（カーソル位置に基づく）
            const cursorLine = text.substring(0, this.cursorPosition).split('\n').length - 1;
            
            // スクロールオフセットを調整（カーソルが見えるように）
            if(cursorLine < this.inputScrollOffset) {
                this.inputScrollOffset = cursorLine;
            } else if(cursorLine >= this.inputScrollOffset + maxDisplayLines) {
                this.inputScrollOffset = cursorLine - maxDisplayLines + 1;
            }
            
            // 表示範囲を制限
            if(this.inputScrollOffset < 0) this.inputScrollOffset = 0;
            if(this.inputScrollOffset > Math.max(0, lines.length - maxDisplayLines)) {
                this.inputScrollOffset = Math.max(0, lines.length - maxDisplayLines);
            }
            
            const displayLines = lines.slice(this.inputScrollOffset, this.inputScrollOffset + maxDisplayLines);
            
            displayLines.forEach((line, i) => {
                const actualLineIndex = this.inputScrollOffset + i;
                // 各行を43文字まで表示
                const displayLine = line.length > 43 ? line.substring(0, 43) + '...' : line;
                ctx.fillText(displayLine || ' ', 70, 90 + i * 25);
                
                // カーソル表示
                const linesBeforeCursor = text.substring(0, this.cursorPosition).split('\n');
                if(linesBeforeCursor.length - 1 === actualLineIndex) {
                    const lastLine = linesBeforeCursor[linesBeforeCursor.length - 1];
                    const cursorX = 70 + ctx.measureText(lastLine).width;
                    ctx.fillStyle = '#0f0';
                    ctx.fillRect(cursorX, 90 + i * 25, 2, 20);
                    ctx.fillStyle = '#fff';
                }
            });
            
            // スクロール情報
            if(lines.length > maxDisplayLines) {
                ctx.fillStyle = '#888';
                ctx.font = '14px Arial';
                ctx.textAlign = 'right';
                ctx.fillText(`${this.inputScrollOffset + 1}-${this.inputScrollOffset + displayLines.length}/${lines.length}行`, 960, 85);
            }
            
            console.log('📝 Drawing lines:', displayLines.length, 'scroll:', this.inputScrollOffset);
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
            ['z','x','c','v','b','n','m','←','→'],
            ['-','。','、','🎤','削除','改行','リスト','完了']  // 改行ボタンを追加
        ];
        
        const keyWidth = 65;  // キー幅をさらに小さく
        const keyHeight = 50;
        const startY = 170;
        const gap = 10;
        
        keys.forEach((row, rowIdx) => {
            // 各行の幅を正確に計算
            let totalRowWidth = 0;
            row.forEach(key => {
                totalRowWidth += keyWidth + gap;
            });
            totalRowWidth -= gap;
            
            const startX = (1024 - totalRowWidth) / 2;
            
            let currentX = startX;
            row.forEach((key) => {
                const x = currentX;
                const y = startY + rowIdx * (keyHeight + gap);
                const w = keyWidth;
                
                // キー背景
                let bgColor = '#555';
                if(key === '完了') bgColor = '#4CAF50';
                else if(key === '削除') bgColor = '#f44336';
                else if(key === 'リスト') bgColor = '#FF9800';
                else if(key === '改行') bgColor = '#2196F3';
                else if(key === '←' || key === '→') bgColor = '#9C27B0';
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
                ctx.font = key.length > 3 ? 'bold 18px Arial' : 'bold 24px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(key, x + w / 2, y + keyHeight / 2);
                
                currentX += w + gap;
            });
        });
    }
    
    // メモリスト描画
    drawMemoList(ctx) {
        // タイトル
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('メモリスト', 512, 40);
        
        console.log('📋 drawMemoList - memoManager:', this.memoManager);
        
        if(!this.memoManager) {
            ctx.font = '20px Arial';
            ctx.fillStyle = '#f44336';
            ctx.fillText('メモマネージャーが利用できません', 512, 200);
            
            // デバッグ情報を表示
            ctx.font = '16px Arial';
            ctx.fillStyle = '#888';
            ctx.textAlign = 'left';
            ctx.fillText('Debug:', 50, 250);
            ctx.fillText('memoManager = ' + (this.memoManager === null ? 'null' : typeof this.memoManager), 50, 280);
            ctx.fillText('Version: ' + this.VERSION, 50, 310);
            
            this.drawBackButton(ctx);
            return;
        }
        
        const memos = this.memoManager.getAllMemos();
        console.log('📋 Memos count:', memos.length);
        
        if(memos.length === 0) {
            ctx.font = '24px Arial';
            ctx.fillStyle = '#888';
            ctx.fillText('メモがありません', 512, 200);
            
            // デバッグ情報を表示
            ctx.font = '16px Arial';
            ctx.textAlign = 'left';
            ctx.fillText('Debug:', 50, 250);
            ctx.fillText('memoManager: OK', 50, 280);
            ctx.fillText('Memos: ' + memos.length, 50, 310);
            
            // 戻るボタン
            this.drawBackButton(ctx);
            return;
        }
        
        // メモリスト表示（最大5件、スクロール対応）
        const startY = 80;
        const itemHeight = 70;
        const maxDisplay = 5;
        
        const startIndex = this.memoListScrollOffset;
        const endIndex = Math.min(startIndex + maxDisplay, memos.length);
        
        for(let i = startIndex; i < endIndex; i++) {
            const memo = memos[i];
            const displayIndex = i - startIndex;  // 画面上の位置
            const y = startY + displayIndex * itemHeight;
            const isSelected = i === this.selectedMemoIndex;
            
            // 背景
            ctx.fillStyle = isSelected ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255, 255, 255, 0.1)';
            ctx.fillRect(50, y, 924, 60);
            
            // 枠
            ctx.strokeStyle = isSelected ? '#4CAF50' : '#888';
            ctx.lineWidth = isSelected ? 3 : 1;
            ctx.strokeRect(50, y, 924, 60);
            
            // テキスト
            ctx.fillStyle = '#fff';
            ctx.font = '20px Arial';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            
            const text = memo.text.length > 45 ? memo.text.substring(0, 45) + '...' : memo.text;
            ctx.fillText(`${i + 1}. ${text}`, 70, y + 30);
            
            // デバッグ：インデックスを表示
            ctx.fillStyle = '#666';
            ctx.font = '12px Arial';
            ctx.textAlign = 'right';
            ctx.fillText(`#${i}`, 960, y + 50);
        }
        
        // デバッグ：選択中のインデックスを表示
        ctx.fillStyle = '#0f0';
        ctx.font = '16px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`選択: ${this.selectedMemoIndex} / スクロール: ${this.memoListScrollOffset}`, 50, 65);
        
        // ボタン
        this.drawMemoListButtons(ctx, memos.length);
    }
    
    // メモリストのボタン描画
    drawMemoListButtons(ctx, memoCount) {
        const buttons = [
            { text: '↑選択', x: 120, y: 450, w: 100, color: '#2196F3' },
            { text: '↓選択', x: 240, y: 450, w: 100, color: '#2196F3' },
            { text: '↑スクロール', x: 380, y: 450, w: 120, color: '#9C27B0' },
            { text: '↓スクロール', x: 520, y: 450, w: 120, color: '#9C27B0' },
            { text: '編集', x: 680, y: 450, w: 100, color: '#FF9800' },
            { text: '削除', x: 800, y: 450, w: 100, color: '#f44336' },
            { text: '戻る', x: 920, y: 450, w: 80, color: '#607D8B' }
        ];
        
        buttons.forEach(btn => {
            // 背景
            ctx.fillStyle = btn.color;
            ctx.fillRect(btn.x - btn.w/2, btn.y, btn.w, 50);
            
            // 枠
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.strokeRect(btn.x - btn.w/2, btn.y, btn.w, 50);
            
            // テキスト
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(btn.text, btn.x, btn.y + 25);
        });
        
        // スクロール情報
        if(memoCount > 5) {
            ctx.fillStyle = '#888';
            ctx.font = '14px Arial';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'top';
            ctx.fillText(`${this.memoListScrollOffset + 1}-${Math.min(this.memoListScrollOffset + 5, memoCount)} / ${memoCount}`, 970, 420);
        }
    }
    
    // 戻るボタン描画
    drawBackButton(ctx) {
        const x = 462;
        const y = 450;
        const w = 100;
        const h = 50;
        
        ctx.fillStyle = '#FF9800';
        ctx.fillRect(x, y, w, h);
        
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('戻る', x + w/2, y + h/2);
    }
    
    // キー押下
    pressKey(key) {
        console.log('🔑 Key pressed:', key);
        console.log('📝 Current input:', this.input);
        console.log('📝 Current romaji:', this.romajiBuffer);
        console.log('📋 Show memo list:', this.showMemoList);
        
        // メモリストモードの場合
        if(this.showMemoList) {
            this.handleMemoListKey(key);
            return;
        }
        
        // 通常のキーボードモード
        if(key === '🎤') {
            this.toggleVoiceInput();
            return;
        }
        
        if(key === 'リスト') {
            this.toggleMemoList();
            return;
        }
        
        if(key === '改行') {
            this.input = this.input.substring(0, this.cursorPosition) + '\n' + this.input.substring(this.cursorPosition);
            this.cursorPosition++;
            console.log('↵ After newline - cursor:', this.cursorPosition);
            this.requestUpdate();
            return;
        }
        
        if(key === '←') {
            this.cursorPosition = Math.max(0, this.cursorPosition - 1);
            console.log('← Cursor moved left:', this.cursorPosition);
            this.requestUpdate();
            return;
        }
        
        if(key === '→') {
            this.cursorPosition = Math.min(this.input.length, this.cursorPosition + 1);
            console.log('→ Cursor moved right:', this.cursorPosition);
            this.requestUpdate();
            return;
        }
        
        if(key === '削除') {
            if(this.romajiBuffer.length > 0) {
                this.romajiBuffer = this.romajiBuffer.slice(0, -1);
            } else if(this.cursorPosition > 0) {
                // カーソル位置の前の文字を削除
                this.input = this.input.substring(0, this.cursorPosition - 1) + this.input.substring(this.cursorPosition);
                this.cursorPosition--;
            }
            console.log('✂️ After delete - cursor:', this.cursorPosition);
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
            console.log('📝 editingMemoId:', this.editingMemoId);
            
            // 編集モードの場合はメモを更新
            if(this.editingMemoId !== null && this.memoManager) {
                console.log('🔄 メモ更新を実行...');
                const success = this.memoManager.update(this.editingMemoId, this.input);
                if(success) {
                    console.log('✅ Updated memo:', this.editingMemoId, 'with text:', this.input);
                } else {
                    console.error('❌ Failed to update memo:', this.editingMemoId);
                }
                this.editingMemoId = null;
            } else if(this.onComplete) {
                // 新規メモ作成
                console.log('🆕 新規メモ作成');
                this.onComplete(this.input);
            } else {
                console.log('⚠️ editingMemoId is null and onComplete is not set');
            }
            
            this.hide();
            return;
        }
        
        // 数字や記号はそのまま入力
        if(/[0-9。、ー\-]/.test(key)) {
            this.input = this.input.substring(0, this.cursorPosition) + key + this.input.substring(this.cursorPosition);
            this.cursorPosition++;
            console.log('🔢 After number/symbol - cursor:', this.cursorPosition);
            this.requestUpdate();
            return;
        }
        
        this.processRomaji(key.toLowerCase());
        console.log('🔤 After romaji - input:', this.input, 'romaji:', this.romajiBuffer, 'cursor:', this.cursorPosition);
        this.requestUpdate();
    }
    
    // メモリスト表示切替
    toggleMemoList() {
        this.showMemoList = !this.showMemoList;
        if(this.showMemoList) {
            this.selectedMemoIndex = 0;
            this.memoListScrollOffset = 0;  // スクロール位置をリセット
        }
        this.requestUpdate();
    }
    
    // メモリストのキー処理
    handleMemoListKey(key) {
        if(!this.memoManager) return;
        
        const memos = this.memoManager.getAllMemos();
        
        // 戻るボタン
        if(key === '戻る') {
            this.toggleMemoList();
            return;
        }
        
        if(memos.length === 0) return;
        
        // メモの直接選択
        if(key && key.startsWith('MEMO_')) {
            const displayIndex = parseInt(key.replace('MEMO_', ''));
            const actualIndex = this.memoListScrollOffset + displayIndex;
            if(actualIndex >= 0 && actualIndex < memos.length) {
                this.selectedMemoIndex = actualIndex;
                console.log('✅ メモ選択:', actualIndex);
                this.requestUpdate();
            }
            return;
        }
        
        // 選択移動ボタン
        if(key === '↑選択') {
            this.selectedMemoIndex = Math.max(0, this.selectedMemoIndex - 1);
            // 選択がスクロール範囲外なら追従
            if(this.selectedMemoIndex < this.memoListScrollOffset) {
                this.memoListScrollOffset = this.selectedMemoIndex;
            }
            this.requestUpdate();
            return;
        }
        
        if(key === '↓選択') {
            this.selectedMemoIndex = Math.min(memos.length - 1, this.selectedMemoIndex + 1);
            // 選択がスクロール範囲外なら追従
            if(this.selectedMemoIndex >= this.memoListScrollOffset + 5) {
                this.memoListScrollOffset = this.selectedMemoIndex - 4;
            }
            this.requestUpdate();
            return;
        }
        
        // スクロールボタン
        if(key === '↑スクロール') {
            this.memoListScrollOffset = Math.max(0, this.memoListScrollOffset - 1);
            this.requestUpdate();
            return;
        }
        
        if(key === '↓スクロール') {
            this.memoListScrollOffset = Math.min(memos.length - 5, this.memoListScrollOffset + 1);
            if(this.memoListScrollOffset < 0) this.memoListScrollOffset = 0;
            this.requestUpdate();
            return;
        }
        
        // 編集ボタン
        if(key === '編集') {
            if(this.selectedMemoIndex >= 0 && this.selectedMemoIndex < memos.length) {
                const memo = memos[this.selectedMemoIndex];
                console.log('✏️ Editing memo:', memo.id);
                this.editMemo(memo);
            }
            return;
        }
        
        // 削除ボタン
        if(key === '削除') {
            if(this.selectedMemoIndex >= 0 && this.selectedMemoIndex < memos.length) {
                const memo = memos[this.selectedMemoIndex];
                console.log('🗑️ Deleting memo:', memo.id);
                this.memoManager.delete(memo.id);
                
                // 選択インデックスを調整
                const newMemos = this.memoManager.getAllMemos();
                if(newMemos.length === 0) {
                    this.selectedMemoIndex = -1;
                    this.memoListScrollOffset = 0;
                } else {
                    if(this.selectedMemoIndex >= newMemos.length) {
                        this.selectedMemoIndex = newMemos.length - 1;
                    }
                    // スクロール位置も調整
                    if(this.memoListScrollOffset > newMemos.length - 5) {
                        this.memoListScrollOffset = Math.max(0, newMemos.length - 5);
                    }
                }
                
                this.requestUpdate();
            }
            return;
        }
    }
    
    // メモ編集開始
    editMemo(memo) {
        console.log('📝 メモ編集開始:', memo);
        console.log('📝 メモID:', memo.id);
        console.log('📝 メモテキスト:', memo.text);
        
        this.editingMemoId = memo.id;
        this.input = memo.text;
        this.cursorPosition = memo.text.length;  // カーソルを末尾に
        this.inputScrollOffset = Math.max(0, memo.text.split('\n').length - 3);  // 最後が見えるようにスクロール
        this.romajiBuffer = '';
        this.showMemoList = false;
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
            this.input = this.input.substring(0, this.cursorPosition) + 'ん' + this.input.substring(this.cursorPosition);
            this.cursorPosition++;
            this.romajiBuffer = '';
            return;
        }
        
        // 促音変換
        if(this.romajiBuffer.length >= 2) {
            const last2 = this.romajiBuffer.slice(-2);
            if(last2[0] === last2[1] && /[bcdfghjklmpqrstvwxyz]/.test(last2[0]) && last2[0] !== 'n') {
                this.input = this.input.substring(0, this.cursorPosition) + 'っ' + this.input.substring(this.cursorPosition);
                this.cursorPosition++;
                this.romajiBuffer = this.romajiBuffer.slice(-1);
            }
        }
        
        // テーブルから変換
        // n単独の場合は変換しない（nnを待つ、またはna/ni/nu/ne/noなどを待つ）
        for(let len = 3; len > 0; len--) {
            const part = this.romajiBuffer.slice(-len);
            
            // n単独の場合はスキップ
            if(part === 'n' && len === 1) {
                continue;
            }
            
            if(this.ROMAJI_TABLE[part]) {
                const hiragana = this.ROMAJI_TABLE[part];
                this.input = this.input.substring(0, this.cursorPosition) + hiragana + this.input.substring(this.cursorPosition);
                this.cursorPosition += hiragana.length;
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
        
        // メモリストモードの場合
        if(this.showMemoList) {
            return this.detectMemoListKey(x, y);
        }
        
        // 通常のキーボードモード
        const keys = [
            ['1','2','3','4','5','6','7','8','9','0'],
            ['q','w','e','r','t','y','u','i','o','p'],
            ['a','s','d','f','g','h','j','k','l'],
            ['z','x','c','v','b','n','m','←','→'],
            ['-','。','、','🎤','削除','改行','リスト','完了']
        ];
        
        const keyWidth = 65;
        const keyHeight = 50;
        const gap = 10;
        const startY = 170;
        
        if(y > startY) {
            const relY = y - startY;
            const rowIdx = Math.floor(relY / (keyHeight + gap));
            
            if(rowIdx >= 0 && rowIdx < keys.length) {
                const row = keys[rowIdx];
                
                // 各行の開始位置を正確に計算
                let totalRowWidth = 0;
                row.forEach(key => {
                    totalRowWidth += keyWidth + gap;
                });
                totalRowWidth -= gap;
                
                const startX = (1024 - totalRowWidth) / 2;
                const relX = x - startX;
                
                if(relX < 0) return null;
                
                // 当たり判定
                let currentX = 0;
                for(let i = 0; i < row.length; i++) {
                    const key = row[i];
                    const w = keyWidth;
                    
                    if(relX >= currentX && relX < currentX + w) {
                        return key;
                    }
                    
                    currentX += w + gap;
                }
            }
        }
        
        return null;
    }
    
    // メモリストのキー検出
    detectMemoListKey(x, y) {
        console.log('🔍 detectMemoListKey - x:', x.toFixed(1), 'y:', y.toFixed(1));
        
        // メモアイテムの直接選択（y=80-430の範囲）
        const startY = 80;
        const itemHeight = 70;
        const maxDisplay = 5;
        
        if(y >= startY && y < startY + maxDisplay * itemHeight) {
            console.log('📝 メモエリア内をクリック');
            // メモエリア内をクリック
            if(x >= 50 && x <= 974) {
                const displayIndex = Math.floor((y - startY) / itemHeight);
                console.log('📝 表示インデックス:', displayIndex);
                
                if(displayIndex >= 0 && displayIndex < maxDisplay) {
                    console.log('✅ メモ選択: MEMO_' + displayIndex);
                    return `MEMO_${displayIndex}`;
                }
            }
        }
        
        // ボタンエリア（y=450-500）
        if(y >= 450 && y <= 500) {
            console.log('✅ Y範囲内（ボタンエリア）');
            
            // ↑選択: x=120, w=100 → 70-170
            if(x >= 70 && x < 170) {
                console.log('⬆️ ↑選択ボタン検出');
                return '↑選択';
            }
            // ↓選択: x=240, w=100 → 190-290
            if(x >= 190 && x < 290) {
                console.log('⬇️ ↓選択ボタン検出');
                return '↓選択';
            }
            // ↑スクロール: x=380, w=120 → 320-440
            if(x >= 320 && x < 440) {
                console.log('⬆️ ↑スクロールボタン検出');
                return '↑スクロール';
            }
            // ↓スクロール: x=520, w=120 → 460-580
            if(x >= 460 && x < 580) {
                console.log('⬇️ ↓スクロールボタン検出');
                return '↓スクロール';
            }
            // 編集: x=680, w=100 → 630-730
            if(x >= 630 && x < 730) {
                console.log('✏️ 編集ボタン検出');
                return '編集';
            }
            // 削除: x=800, w=100 → 750-850
            if(x >= 750 && x < 850) {
                console.log('🗑️ 削除ボタン検出');
                return '削除';
            }
            // 戻る: x=920, w=80 → 880-960
            if(x >= 880 && x < 960) {
                console.log('◀️ 戻るボタン検出');
                return '戻る';
            }
            
            // メモがない時の中央の戻るボタン: x=462, w=100 → 462-562
            if(x >= 462 && x < 562) {
                console.log('◀️ 中央戻るボタン検出');
                return '戻る';
            }
            
            console.log('❌ どのボタンにも該当せず');
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
