// ドローンシミュレーター - タイムアタックゲーム
// Three.jsを使用した3Dドローン飛行ゲーム

// グローバル変数
let scene, camera, renderer;
let drone, droneVelocity = new THREE.Vector3();
let buildings = [];
let obstacles = [];
let gameState = 'menu'; // menu, playing, crashed, victory
let startTime = Date.now();
let elapsedTime = 0;
let keys = {};
let droneHealth = 100;
let droneDamaged = false;
let mouseLocked = false;
let pitch = 0; // 上下の視点角度
let yaw = 0; // 左右の視点角度
let enemyDrones = [];
let playerLasers = [];
let enemyLasers = [];
let lastShotTime = 0;
let totalEnemyDrones = 0;
let difficulty = 1; // 難易度 (0-3)

// シールド
let shieldActive = false;
let shieldEndTime = 0;
let lastShieldTime = -30000; // 開始直後に使用可能にする
let shieldMesh = null;

// ゲーム設定
const GAME_CONFIG = {
    droneSpeed: 0.15,
    droneRotationSpeed: 0.03,
    gravity: -0.002,
    maxVelocity: 0.3,
    collisionDamageThreshold: 0.1,
    courseWidth: 100,
    courseLength: 200,
    buildingHeight: 30,
    difficultySettings: {
        0: { name: 'とてもかんたん', accuracy: 0.1, shootInterval: 6000 },
        1: { name: 'かんたん', accuracy: 0.3, shootInterval: 4000 },
        2: { name: 'ふつう', accuracy: 0.6, shootInterval: 3000 },
        3: { name: 'むずかしい', accuracy: 0.9, shootInterval: 2000 }
    }
};

// 初期化関数
function init() {
    try {
        console.log('初期化開始...');
        
        // シーンの作成
        scene = new THREE.Scene();
        scene.fog = new THREE.Fog(0x87CEEB, 50, 300);
        console.log('シーン作成完了');
        
        // カメラの設定
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 15, 20);
        console.log('カメラ設定完了');
        
        // レンダラーの設定
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) {
            console.error('Canvas要素が見つかりません');
            return;
        }
        
        renderer = new THREE.WebGLRenderer({ 
            canvas: canvas,
            antialias: true 
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        console.log('レンダラー設定完了');
        
        // 照明の設定
        setupLighting();
        console.log('照明設定完了');
        
        // コースの作成
        createCourse();
        console.log('コース作成完了');
        
        // ドローンの作成
        createDrone();
        console.log('ドローン作成完了');
        
        // イベントリスナーの設定
        setupEventListeners();
        console.log('イベントリスナー設定完了');
        
        console.log('初期化完了');
        
    } catch (error) {
        console.error('初期化中にエラーが発生:', error);
        alert('ゲームの初期化に失敗しました: ' + error.message);
    }
    
    // ゲームループ開始
    animate();
}

// 照明設定
function setupLighting() {
    // 環境光
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);
    
    // 太陽光
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    scene.add(directionalLight);
}

// コース作成
function createCourse() {
    // 地面
    const groundGeometry = new THREE.PlaneGeometry(GAME_CONFIG.courseWidth * 2, GAME_CONFIG.courseLength * 2);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    
    // 建物群の作成
    createBuildings();
    
    // 障害物の作成
    createObstacles();
    
    // 敵ドローンの作成
    createEnemyDrones();
}

// 建物作成
function createBuildings() {
    const buildingPositions = [
        { x: -30, z: 20, width: 15, depth: 15, height: 25 },
        { x: 30, z: 20, width: 20, depth: 15, height: 35 },
        { x: -35, z: 50, width: 15, depth: 20, height: 30 },
        { x: 35, z: 50, width: 18, depth: 18, height: 28 },
        { x: -25, z: 80, width: 20, depth: 15, height: 32 },
        { x: 25, z: 80, width: 15, depth: 20, height: 26 },
        { x: -30, z: 110, width: 25, depth: 15, height: 40 },
        { x: 30, z: 110, width: 15, depth: 25, height: 30 },
        { x: -20, z: 140, width: 18, depth: 18, height: 35 },
        { x: 20, z: 140, width: 20, depth: 15, height: 28 },
        { x: -35, z: 170, width: 15, depth: 20, height: 32 },
        { x: 35, z: 170, width: 20, depth: 15, height: 38 }
    ];
    
    buildingPositions.forEach(pos => {
        const building = createBuilding(pos.x, pos.z, pos.width, pos.depth, pos.height);
        buildings.push(building);
        scene.add(building);
    });
}

// 個別の建物作成
function createBuilding(x, z, width, depth, height) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshLambertMaterial({ 
        color: new THREE.Color(0.3 + Math.random() * 0.3, 0.3 + Math.random() * 0.3, 0.3 + Math.random() * 0.3)
    });
    const building = new THREE.Mesh(geometry, material);
    building.position.set(x, height / 2, z);
    building.castShadow = true;
    building.receiveShadow = true;
    
    // 衝突判定用のバウンディングボックス
    building.userData.boundingBox = new THREE.Box3().setFromObject(building);
    
    return building;
}

// 障害物作成
function createObstacles() {
    const obstaclePositions = [
        { x: -15, z: 40, radius: 3, height: 8 },
        { x: 15, z: 60, radius: 2.5, height: 6 },
        { x: -10, z: 90, radius: 3.5, height: 10 },
        { x: 10, z: 120, radius: 2, height: 7 },
        { x: -18, z: 150, radius: 3, height: 9 },
        { x: 18, z: 180, radius: 2.5, height: 8 }
    ];
    
    obstaclePositions.forEach(pos => {
        const obstacle = createObstacle(pos.x, pos.z, pos.radius, pos.height);
        obstacles.push(obstacle);
        scene.add(obstacle);
    });
}

// 個別の障害物作成
function createObstacle(x, z, radius, height) {
    const geometry = new THREE.CylinderGeometry(radius, radius, height, 8);
    const material = new THREE.MeshLambertMaterial({ color: 0xff6b6b });
    const obstacle = new THREE.Mesh(geometry, material);
    obstacle.position.set(x, height / 2, z);
    obstacle.castShadow = true;
    obstacle.receiveShadow = true;
    
    // 衝突判定用のバウンディング球
    obstacle.userData.boundingSphere = new THREE.Sphere(obstacle.position, radius);
    
    return obstacle;
}

// 敵ドローン作成
function createEnemyDrones() {
    const enemyPositions = [
        { x: -20, z: 40, patrolRadius: 15 },
        { x: 20, z: 80, patrolRadius: 20 },
        { x: -15, z: 120, patrolRadius: 18 },
        { x: 25, z: 160, patrolRadius: 12 }
    ];
    
    const difficultySetting = GAME_CONFIG.difficultySettings[difficulty];
    
    enemyPositions.forEach((pos, index) => {
        const enemy = createEnemyDrone(pos.x, pos.z, pos.patrolRadius, index, difficultySetting);
        enemyDrones.push(enemy);
        scene.add(enemy);
    });
    
    totalEnemyDrones = enemyDrones.length;
}

// 個別の敵ドローン作成
function createEnemyDrone(x, z, patrolRadius, index, difficultySetting) {
    const enemyGroup = new THREE.Group();
    
    // 敵ドローン本体（赤色）
    const frameGeometry = new THREE.BoxGeometry(3, 0.4, 3);
    const frameMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 });
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    enemyGroup.add(frame);
    
    // プロペラ
    const propellerGeometry = new THREE.CylinderGeometry(1.2, 1.2, 0.1, 6);
    const propellerMaterial = new THREE.MeshLambertMaterial({ color: 0x990000 });
    
    const propellerPositions = [
        { x: 1, z: 1 },
        { x: -1, z: 1 },
        { x: 1, z: -1 },
        { x: -1, z: -1 }
    ];
    
    propellerPositions.forEach(pos => {
        const propeller = new THREE.Mesh(propellerGeometry, propellerMaterial);
        propeller.position.set(pos.x, 0.3, pos.z);
        propeller.userData.isPropeller = true;
        enemyGroup.add(propeller);
    });
    
    enemyGroup.position.set(x, 10, z);
    enemyGroup.castShadow = true;
    
    // 敵ドローンのデータ
    enemyGroup.userData = {
        centerX: x,
        centerZ: z,
        patrolRadius: patrolRadius,
        angle: (index * Math.PI / 2),
        lastShotTime: 0,
        shootInterval: difficultySetting.shootInterval + Math.random() * 2000,
        accuracy: difficultySetting.accuracy
    };
    
    return enemyGroup;
}

// プレイヤーレーザー作成
function createPlayerLaser() {
    const currentTime = Date.now();
    if (currentTime - lastShotTime < 500) return; // 連射制限
    
    // レーザーの発射位置と方向（純粋な視点方向）
    const startPos = drone.position.clone();
    const direction = new THREE.Vector3(0, 0, -1);
    
    // ピッチとヨーのみを適用（ドローンの向きは無視）
    const pitchRotation = new THREE.Quaternion();
    pitchRotation.setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitch);
    direction.applyQuaternion(pitchRotation);
    
    const yawRotation = new THREE.Quaternion();
    yawRotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    direction.applyQuaternion(yawRotation);
    
    const laserGeometry = new THREE.CylinderGeometry(0.08, 0.08, 100);
    const laserMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x0080ff,
        emissive: 0x0080ff,
        transparent: true,
        opacity: 0.9
    });
    const laser = new THREE.Mesh(laserGeometry, laserMaterial);
    
    // レーザーを視点方向に向ける
    laser.position.copy(startPos);
    laser.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    
    laser.userData = {
        createdAt: currentTime,
        direction: direction.clone(),
        startPos: startPos.clone()
    };
    
    playerLasers.push(laser);
    scene.add(laser);
    lastShotTime = currentTime;
}

// 敵レーザー作成
function createEnemyLaser(startPos, direction) {
    const laserGeometry = new THREE.CylinderGeometry(0.1, 0.1, 50);
    const laserMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xff0000,
        emissive: 0xff0000,
        transparent: true,
        opacity: 0.8
    });
    const laser = new THREE.Mesh(laserGeometry, laserMaterial);
    
    laser.position.copy(startPos);
    
    // レーザーを方向に向ける（シリンダーをY軸方向に配置）
    laser.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    
    laser.userData = {
        createdAt: Date.now(),
        direction: direction.clone(),
        startPos: startPos.clone()
    };
    
    return laser;
}

// 敵ドローン更新
function updateEnemyDrones() {
    if (gameState !== 'playing') return;
    
    const currentTime = Date.now();
    
    enemyDrones.forEach(enemy => {
        // 巡回移動
        enemy.userData.angle += 0.01;
        const x = enemy.userData.centerX + Math.cos(enemy.userData.angle) * enemy.userData.patrolRadius;
        const z = enemy.userData.centerZ + Math.sin(enemy.userData.angle) * enemy.userData.patrolRadius;
        enemy.position.set(x, 10, z);
        
        // プロペラ回転
        enemy.children.forEach(child => {
            if (child.userData.isPropeller) {
                child.rotation.y += 0.8;
            }
        });
        
        // プレイヤーに向ける
        enemy.lookAt(drone.position);
        
        // レーザー発射
        if (currentTime - enemy.userData.lastShotTime > enemy.userData.shootInterval) {
            const distance = enemy.position.distanceTo(drone.position);
            if (distance < 60) { // 射程範囲内
                // 命中率に基づいて外す可能性
                if (Math.random() < enemy.userData.accuracy) {
                    const direction = drone.position.clone().sub(enemy.position).normalize();
                    const laser = createEnemyLaser(enemy.position.clone(), direction);
                    enemyLasers.push(laser);
                    scene.add(laser);
                } else {
                    // 外す場合（少し外れた方向に発射）
                    const baseDirection = drone.position.clone().sub(enemy.position).normalize();
                    const missAngle = (Math.random() - 0.5) * 0.5; // 外す角度
                    const missRotation = new THREE.Quaternion();
                    missRotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), missAngle);
                    baseDirection.applyQuaternion(missRotation);
                    
                    const laser = createEnemyLaser(enemy.position.clone(), baseDirection);
                    enemyLasers.push(laser);
                    scene.add(laser);
                }
                enemy.userData.lastShotTime = currentTime;
            }
        }
    });
}

// プレイヤーレーザー更新
function updatePlayerLasers() {
    const currentTime = Date.now();
    
    for (let i = playerLasers.length - 1; i >= 0; i--) {
        const laser = playerLasers[i];
        
        // レーザー寿命（1.5秒）
        if (currentTime - laser.userData.createdAt > 1500) {
            scene.remove(laser);
            playerLasers.splice(i, 1);
            continue;
        }
        
        // 敵ドローンとの衝突判定
        const laserBox = new THREE.Box3().setFromObject(laser);
        let hitDetected = false;
        
        for (let j = enemyDrones.length - 1; j >= 0; j--) {
            const enemy = enemyDrones[j];
            const enemyBox = new THREE.Box3().setFromObject(enemy);
            
            if (laserBox.intersectsBox(enemyBox)) {
                // 敵ドローン破壊
                scene.remove(enemy);
                enemyDrones.splice(j, 1);
                
                scene.remove(laser);
                playerLasers.splice(i, 1);
                
                // 十字架を赤くする
                showCrosshairHit();
                
                // 全敵ドローン破壊チェック
                if (enemyDrones.length === 0) {
                    gameState = 'victory';
                    const finalTime = ((Date.now() - startTime) / 1000).toFixed(1);
                    showMessage(`勝利！クリアタイム: ${finalTime}秒`);
                    document.getElementById('status').textContent = '勝利';
                    document.getElementById('restartBtn').style.display = 'block';
                }
                hitDetected = true;
                break;
            }
        }
    }
}

// 十字架の命中エフェクト
function showCrosshairHit() {
    const crosshair = document.getElementById('crosshair');
    crosshair.classList.add('hit');
    
    // 0.2秒後に元に戻す
    setTimeout(() => {
        crosshair.classList.remove('hit');
    }, 200);
}

// 敵レーザー更新
function updateEnemyLasers() {
    const currentTime = Date.now();
    
    for (let i = enemyLasers.length - 1; i >= 0; i--) {
        const laser = enemyLasers[i];
        
        // レーザー寿命（2秒）
        if (currentTime - laser.userData.createdAt > 2000) {
            scene.remove(laser);
            enemyLasers.splice(i, 1);
            continue;
        }
        
        // シールド中はレーザーを無効化
        if (shieldActive) {
            scene.remove(laser);
            enemyLasers.splice(i, 1);
            continue;
        }
        
        // プレイヤーとの衝突判定
        const laserBox = new THREE.Box3().setFromObject(laser);
        const droneBox = new THREE.Box3().setFromObject(drone);
        
        if (laserBox.intersectsBox(droneBox)) {
            // レーザー命中即ゲームオーバー
            gameState = 'crashed';
            showMessage('レーザー命中！ゲームオーバー');
            document.getElementById('status').textContent = '撃墜';
            document.getElementById('restartBtn').style.display = 'block';
            
            scene.remove(laser);
            enemyLasers.splice(i, 1);
        }
    }
}

// ゴールエリア作成
function createGoalArea() {
    const goalGeometry = new THREE.PlaneGeometry(30, 30);
    const goalMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x00ff00, 
        transparent: true, 
        opacity: 0.5 
    });
    goalArea = new THREE.Mesh(goalGeometry, goalMaterial);
    goalArea.rotation.x = -Math.PI / 2;
    goalArea.position.set(0, 0.1, 180);
    scene.add(goalArea);
    
    // ゴールフラッグ
    const flagGeometry = new THREE.ConeGeometry(2, 8, 8);
    const flagMaterial = new THREE.MeshLambertMaterial({ color: 0xffff00 });
    const flag = new THREE.Mesh(flagGeometry, flagMaterial);
    flag.position.set(0, 4, 180);
    scene.add(flag);
}

// スタートエリア作成
function createStartArea() {
    const startGeometry = new THREE.PlaneGeometry(20, 20);
    const startMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x0080ff, 
        transparent: true, 
        opacity: 0.3 
    });
    const startArea = new THREE.Mesh(startGeometry, startMaterial);
    startArea.rotation.x = -Math.PI / 2;
    startArea.position.set(0, 0.1, 0);
    scene.add(startArea);
}

// ドローン作成
function createDrone() {
    // ドローン本体
    const droneGroup = new THREE.Group();
    
    // ドローンフレーム
    const frameGeometry = new THREE.BoxGeometry(4, 0.5, 4);
    const frameMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    droneGroup.add(frame);
    
    // プロペラ（4つ）
    const propellerGeometry = new THREE.CylinderGeometry(1.5, 1.5, 0.1, 8);
    const propellerMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 });
    
    const propellerPositions = [
        { x: 1.5, z: 1.5 },
        { x: -1.5, z: 1.5 },
        { x: 1.5, z: -1.5 },
        { x: -1.5, z: -1.5 }
    ];
    
    propellerPositions.forEach(pos => {
        const propeller = new THREE.Mesh(propellerGeometry, propellerMaterial);
        propeller.position.set(pos.x, 0.5, pos.z);
        propeller.userData.isPropeller = true;
        droneGroup.add(propeller);
    });
    
    // カメラマウント
    const cameraGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    const cameraMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
    const cameraMesh = new THREE.Mesh(cameraGeometry, cameraMaterial);
    cameraMesh.position.set(0, -0.5, 0);
    droneGroup.add(cameraMesh);
    
    drone = droneGroup;
    drone.position.set(0, 8, 0);
    drone.rotation.set(0, 0, 0);
    drone.castShadow = true;
    scene.add(drone);
}

// イベントリスナー設定
function setupEventListeners() {
    // キーボードイベント
    document.addEventListener('keydown', (event) => {
        keys[event.code] = true;
        
        // ESCキーでマウスロック解除
        if (event.code === 'Escape' && mouseLocked) {
            document.exitPointerLock();
        }
    });
    
    document.addEventListener('keyup', (event) => {
        keys[event.code] = false;
    });
    
    // マウスイベント
    document.addEventListener('click', (event) => {
        if (event.target && event.target.closest && event.target.closest('#mobileControls')) {
            return;
        }
        if (!mouseLocked) {
            document.body.requestPointerLock();
        } else if (event.button === 0 && gameState === 'playing') {
            // 左クリックでレーザー発射
            createPlayerLaser();
        }
    });

    const bindHoldKey = (elementId, keyCode) => {
        const el = document.getElementById(elementId);
        if (!el) return;

        const down = (e) => {
            e.preventDefault();
            keys[keyCode] = true;
        };

        const up = (e) => {
            e.preventDefault();
            keys[keyCode] = false;
        };

        el.addEventListener('pointerdown', down, { passive: false });
        el.addEventListener('pointerup', up, { passive: false });
        el.addEventListener('pointercancel', up, { passive: false });
        el.addEventListener('pointerleave', up, { passive: false });
    };

    bindHoldKey('btnUp', 'KeyW');
    bindHoldKey('btnDown', 'KeyS');
    bindHoldKey('btnLeft', 'KeyA');
    bindHoldKey('btnRight', 'KeyD');

    const btnFire = document.getElementById('btnFire');
    if (btnFire) {
        btnFire.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            if (gameState === 'playing') {
                createPlayerLaser();
            }
        }, { passive: false });
    }

    const btnShield = document.getElementById('btnShield');
    if (btnShield) {
        btnShield.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            if (gameState !== 'playing') return;
            if (!shieldActive && Date.now() - lastShieldTime > 30000) {
                activateShield();
            }
        }, { passive: false });
    }
    
    document.addEventListener('pointerlockchange', () => {
        mouseLocked = document.pointerLockElement === document.body;
    });
    
    document.addEventListener('mousemove', (event) => {
        if (mouseLocked && gameState === 'playing') {
            yaw -= event.movementX * 0.002;
            pitch -= event.movementY * 0.002;
            
            // 上下の視点を制限
            pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, pitch));
            
            // ドローンの向きを更新
            drone.rotation.y = yaw;
        }
    });
    
    // ウィンドウリサイズ
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// ドローン操作
function handleDroneControls() {
    if (gameState !== 'playing') return;
    
    const speedMultiplier = droneDamaged ? 0.5 : 1.0;
    
    // シールド操作
    if (keys['KeyF'] && !shieldActive && Date.now() - lastShieldTime > 30000) {
        activateShield();
    }
    
    // 向いている方向に基づいて移動ベクトルを計算
    const forward = new THREE.Vector3(0, 0, -1);
    const right = new THREE.Vector3(1, 0, 0);
    
    // ピッチ（上下の視点）を先に適用
    const pitchRotation = new THREE.Quaternion();
    pitchRotation.setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitch);
    forward.applyQuaternion(pitchRotation);
    right.applyQuaternion(pitchRotation);
    
    // ドローンの向きに応じてベクトルを回転
    forward.applyQuaternion(drone.quaternion);
    right.applyQuaternion(drone.quaternion);
    
    // 前進・後退（向いている方向）
    if (keys['KeyW']) {
        droneVelocity.add(forward.multiplyScalar(GAME_CONFIG.droneSpeed * speedMultiplier));
    }
    if (keys['KeyS']) {
        droneVelocity.add(forward.multiplyScalar(-GAME_CONFIG.droneSpeed * speedMultiplier));
    }
    
    // 左右移動（ドローンの右方向）
    if (keys['KeyA']) {
        droneVelocity.add(right.multiplyScalar(-GAME_CONFIG.droneSpeed * speedMultiplier));
    }
    if (keys['KeyD']) {
        droneVelocity.add(right.multiplyScalar(GAME_CONFIG.droneSpeed * speedMultiplier));
    }
    
    // 速度制限
    const maxSpeed = GAME_CONFIG.maxVelocity * speedMultiplier;
    const currentSpeed = droneVelocity.length();
    if (currentSpeed > maxSpeed) {
        droneVelocity.normalize().multiplyScalar(maxSpeed);
    }
    
    // 空気抵抗
    droneVelocity.multiplyScalar(0.95);
    
    // 重力
    droneVelocity.y += GAME_CONFIG.gravity;
    
    // 高さ制限
    if (drone.position.y <= 3) {
        drone.position.y = 3;
        droneVelocity.y = Math.max(0, droneVelocity.y);
        // 地面に近い場合は水平を保つ
        drone.rotation.x *= 0.9;
        drone.rotation.z *= 0.9;
    }
    if (drone.position.y >= 50) {
        drone.position.y = 50;
        droneVelocity.y = Math.min(0, droneVelocity.y);
    }
    
    // 位置更新
    drone.position.add(droneVelocity);
    
    // コース境界チェック
    const halfWidth = GAME_CONFIG.courseWidth / 2;
    if (Math.abs(drone.position.x) > halfWidth) {
        drone.position.x = Math.sign(drone.position.x) * halfWidth;
        droneVelocity.x *= -0.5;
    }
    
    if (drone.position.z < -10) {
        drone.position.z = -10;
        droneVelocity.z *= -0.5;
    }
    
    if (drone.position.z > GAME_CONFIG.courseLength) {
        drone.position.z = GAME_CONFIG.courseLength;
        droneVelocity.z *= -0.5;
    }
}

// シールド展開
function activateShield() {
    if (shieldActive) return;
    
    shieldActive = true;
    shieldEndTime = Date.now() + 5000; // 5秒間
    lastShieldTime = Date.now();
    
    // シールドメッシュ作成
    const shieldGeometry = new THREE.SphereGeometry(8, 16, 16);
    const shieldMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x00ffff, 
        transparent: true, 
        opacity: 0.3,
        side: THREE.DoubleSide
    });
    
    shieldMesh = new THREE.Mesh(shieldGeometry, shieldMaterial);
    shieldMesh.position.copy(drone.position);
    scene.add(shieldMesh);
    
    showMessage('シールド展開！');
}

// シールド更新
function updateShield() {
    // シールドが有効な場合のみ処理
    if (shieldActive) {
        if (Date.now() > shieldEndTime) {
            // シールド終了
            shieldActive = false;
            if (shieldMesh && shieldMesh.parent) {
                scene.remove(shieldMesh);
                shieldMesh = null;
            }
        } else if (shieldMesh) {
            // シールドをドローンに追従
            shieldMesh.position.copy(drone.position);
        }
    }
}

// 衝突検出
function checkCollisions() {
    if (gameState !== 'playing') return;
    
    // シールド中は衝突無効
    if (shieldActive) return;
    
    const droneBox = new THREE.Box3().setFromObject(drone);
    const droneSpeed = droneVelocity.length();
    
    // 建物との衝突
    buildings.forEach(building => {
        if (droneBox.intersectsBox(building.userData.boundingBox)) {
            handleCollision(droneSpeed);
        }
    });
    
    // 障害物との衝突
    obstacles.forEach(obstacle => {
        if (droneBox.intersectsSphere(obstacle.userData.boundingSphere)) {
            handleCollision(droneSpeed);
        }
    });
    
    // 地面との衝突（より厳しい条件に）
    if (drone.position.y <= 2.8 && droneSpeed > GAME_CONFIG.collisionDamageThreshold * 2) {
        handleCollision(droneSpeed);
    }
}

// 衝突処理
function handleCollision(speed) {
    if (speed > GAME_CONFIG.collisionDamageThreshold) {
        droneHealth -= speed * 50;
        
        if (droneHealth <= 0) {
            gameState = 'crashed';
            showMessage('墜落！ゲームオーバー');
            document.getElementById('status').textContent = '墜落';
            document.getElementById('restartBtn').style.display = 'block';
        } else if (droneHealth <= 50 && !droneDamaged) {
            droneDamaged = true;
            showMessage('ドローンが破損！操作性が低下');
            document.getElementById('status').textContent = '破損';
        }
        
        // 反動（傾きを抑える）
        droneVelocity.multiplyScalar(-0.3);
        drone.rotation.x += (Math.random() - 0.5) * 0.1;
        drone.rotation.z += (Math.random() - 0.5) * 0.1;
        
        // 傾きが大きすぎる場合はリセット
        if (Math.abs(drone.rotation.x) > 0.5) {
            drone.rotation.x = Math.sign(drone.rotation.x) * 0.5;
        }
        if (Math.abs(drone.rotation.z) > 0.5) {
            drone.rotation.z = Math.sign(drone.rotation.z) * 0.5;
        }
    }
}

// HUD更新
function updateHUD() {
    if (gameState === 'playing') {
        elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);
        document.getElementById('timer').textContent = elapsedTime;
        document.getElementById('enemies').textContent = enemyDrones.length;
        
        // シールド状態更新
        if (shieldActive) {
            const remainingTime = Math.max(0, (shieldEndTime - Date.now()) / 1000).toFixed(1);
            document.getElementById('shield').textContent = `展開中 (${remainingTime}秒)`;
            document.getElementById('cooldown').textContent = '-';
        } else {
            const cooldownTime = Math.max(0, 30 - (Date.now() - lastShieldTime) / 1000).toFixed(1);
            document.getElementById('shield').textContent = '準備OK';
            document.getElementById('cooldown').textContent = cooldownTime;
        }
    }
}

// メッセージ表示
function showMessage(text) {
    const messageElement = document.getElementById('gameMessage');
    messageElement.textContent = text;
    messageElement.style.display = 'block';
    
    setTimeout(() => {
        messageElement.style.display = 'none';
    }, 3000);
}

// カメラ更新
function updateCamera() {
    // ドローンを追従するカメラ（視点移動対応）
    const offset = new THREE.Vector3(0, 2, 8);
    
    // ピッチとヨーを適用
    offset.applyAxisAngle(new THREE.Vector3(1, 0, 0), pitch);
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    
    const idealPosition = drone.position.clone().add(offset);
    camera.position.lerp(idealPosition, 0.1);
    
    // ドローンを見る（少し上向き）
    const lookAtTarget = drone.position.clone();
    lookAtTarget.y += 1;
    camera.lookAt(lookAtTarget);
}

// プロペラ回転
function animatePropellers() {
    drone.children.forEach(child => {
        if (child.userData.isPropeller) {
            child.rotation.y += 0.5;
        }
    });
}

// ゲームループ
function animate() {
    requestAnimationFrame(animate);
    
    handleDroneControls();
    checkCollisions();
    updateHUD();
    updateCamera();
    animatePropellers();
    updateEnemyDrones();
    updatePlayerLasers();
    updateEnemyLasers();
    
    // シールド更新は必要な場合のみ
    if (shieldActive) {
        updateShield();
    }
    
    renderer.render(scene, camera);
}

// リスタート関数
function restartGame() {
    // ゲーム状態リセット
    gameState = 'playing';
    startTime = Date.now();
    elapsedTime = 0;
    droneHealth = 100;
    droneDamaged = false;
    
    // ドローン位置リセット
    drone.position.set(0, 8, 0);
    drone.rotation.set(0, 0, 0);
    pitch = 0;
    yaw = 0;
    droneVelocity.set(0, 0, 0);
    
    // レーザーをクリア
    playerLasers.forEach(laser => scene.remove(laser));
    enemyLasers.forEach(laser => scene.remove(laser));
    playerLasers = [];
    enemyLasers = [];
    
    // シールドをクリア
    if (shieldMesh) {
        scene.remove(shieldMesh);
        shieldMesh = null;
    }
    shieldActive = false;
    lastShieldTime = 0;
    
    // 敵ドローンを再作成
    enemyDrones.forEach(enemy => scene.remove(enemy));
    enemyDrones = [];
    createEnemyDrones();
    
    // UIリセット
    document.getElementById('timer').textContent = '0.0';
    document.getElementById('status').textContent = '飛行中';
    document.getElementById('enemies').textContent = totalEnemyDrones;
    document.getElementById('gameMessage').style.display = 'none';
    document.getElementById('restartBtn').style.display = 'none';
}

// ゲーム開始
window.addEventListener('load', () => {
    // 先にシーンを初期化
    init();
    
    // その後で難易度選択メニューを表示
    setTimeout(() => {
        showDifficultyMenu();
    }, 100);
});
