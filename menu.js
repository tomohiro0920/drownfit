// 難易度選択メニュー
function showDifficultyMenu() {
    const menuHtml = `
        <div id="difficultyMenu" style="
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            border: 3px solid rgba(255, 255, 255, 0.5);
            border-radius: 15px;
            padding: 30px;
            text-align: center;
            color: white;
            z-index: 1000;
            font-family: Arial, sans-serif;
        ">
            <h2 style="margin-top: 0; color: #fff; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);">難易度選択</h2>
            <div style="margin: 20px 0;">
                <button onclick="selectDifficulty(0)" style="
                    margin: 10px;
                    padding: 15px 30px;
                    font-size: 18px;
                    background: #2196F3;
                    color: white;
                    border: none;
                    border-radius: 10px;
                    cursor: pointer;
                    font-weight: bold;
                ">とてもかんたん</button>
                <button onclick="selectDifficulty(1)" style="
                    margin: 10px;
                    padding: 15px 30px;
                    font-size: 18px;
                    background: #4CAF50;
                    color: white;
                    border: none;
                    border-radius: 10px;
                    cursor: pointer;
                    font-weight: bold;
                ">かんたん</button>
                <button onclick="selectDifficulty(2)" style="
                    margin: 10px;
                    padding: 15px 30px;
                    font-size: 18px;
                    background: #FF9800;
                    color: white;
                    border: none;
                    border-radius: 10px;
                    cursor: pointer;
                    font-weight: bold;
                ">ふつう</button>
                <button onclick="selectDifficulty(3)" style="
                    margin: 10px;
                    padding: 15px 30px;
                    font-size: 18px;
                    background: #f44336;
                    color: white;
                    border: none;
                    border-radius: 10px;
                    cursor: pointer;
                    font-weight: bold;
                ">むずかしい</button>
            </div>
            <div style="margin-top: 20px; font-size: 14px; opacity: 0.8;">
                <div>とてもかんたん: 命中率10%、射撃間隔6秒</div>
                <div>かんたん: 命中率30%、射撃間隔4秒</div>
                <div>ふつう: 命中率60%、射撃間隔3秒</div>
                <div>むずかしい: 命中率90%、射撃間隔2秒</div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', menuHtml);
}

function selectDifficulty(level) {
    difficulty = level;
    const menu = document.getElementById('difficultyMenu');
    if (menu) {
        menu.remove();
    }
    
    // ゲーム開始
    gameState = 'playing';
    startTime = Date.now();
    
    // HUDに難易度表示
    const difficultyName = GAME_CONFIG.difficultySettings[difficulty].name;
    document.getElementById('status').textContent = `飛行中 (${difficultyName})`;
}
