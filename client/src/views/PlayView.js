import { useEffect, useRef, useState } from "react";

const PlayView = () => {
    const [isHit, setIsHit] = useState(false);
    const setTimeOutRef = useRef(null);
    const [performanceStats, setPerformanceStats] = useState({});
    const [serverStats, setServerStats] = useState({});

    const gameApp = window.pc.app.gameApp;
    if (!gameApp.playerMap) {
        gameApp.playerMap = new Map();
    }

    const OP_CODE_POSITION = 1;
    const OP_CODE_INITIAL_DATA = 2;
    const OP_CODE_PLAYER_SPAWN = 3;
    const OP_CODE_PERFORMANCE = 4;

    // Performance monitoring
    useEffect(() => {
        const updatePerformanceStats = () => {
            const entries = performance.getEntriesByType('measure');
            const stats = {};
            entries.forEach(entry => {
                stats[entry.name] = `${entry.duration.toFixed(2)}ms`;
            });
            setPerformanceStats(stats);
            console.log('Performance Stats:', stats);
        };

        // Update stats every second
        const interval = setInterval(updatePerformanceStats, 1000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!gameApp) return;
        gameApp.socket.onmatchdata = (matchState) => {
            performance.mark('matchdata-start');
            let jsonResult = JSON.parse(String.fromCharCode.apply(null, new Uint8Array(matchState.data)))
            switch (matchState.op_code) {
                case OP_CODE_POSITION:
                    onPlayerMove(jsonResult)
                    break;
                case OP_CODE_INITIAL_DATA:
                    onHandleInitialData(jsonResult)
                    break;
                case OP_CODE_PLAYER_SPAWN:
                    onPlayerSpawn(jsonResult)
                    // 나의 플레이어 스폰
                    // 전에 들어온 사람 x
                    // 내 이후에 들어온 상대방 
                    break;
                case OP_CODE_PERFORMANCE:
                    handleServerPerformance(jsonResult)
                    break;
                default:
                    break;
            }
            performance.mark('matchdata-end');
            performance.measure('Match Data Processing', 'matchdata-start', 'matchdata-end');
        }

        gameApp.socket.onmatchpresence = (matchPresence) => {
            performance.mark('presence-start');
            console.log('matchPresence', matchPresence);
            const match_id = matchPresence.match_id;
            const leaves = matchPresence.leaves;
            const joins = matchPresence.joins;

            if (leaves && leaves.length > 0) {
                leaves.forEach(player => destroyPlayer(player.user_id));
            }
            performance.mark('presence-end');
            performance.measure('Presence Processing', 'presence-start', 'presence-end');
        }
    }, []);

    const destroyPlayer = (user_id) => {
        const playerMap = gameApp.playerMap;
        const playerEntity = playerMap.get(user_id);
        if (playerEntity) {
            playerMap.delete(user_id);
            setTimeout((p) => {
                p.destroy();
            }, 0, playerEntity);
        }
    }

    const onHandleInitialData = (data) => {
        const myAccountId = window.pc.app.gameApp.user.user_id;
        // Spawn all existing players
        for (const player of data.players) {
            if (myAccountId === player.user_id) {
                continue;
            }
            onPlayerSpawn(player);
        }
        // Send spawn message for the new player with current position
        const myPlayer = window.pc.app.root.findByName("Player");
        const myPosition = myPlayer.getPosition();
        gameApp.socket.sendMatchState(gameApp.match_id, OP_CODE_PLAYER_SPAWN, JSON.stringify({ 
            user_id: myAccountId,
            position: [myPosition.x, myPosition.y, myPosition.z]
        }));
    };

    const onPlayerSpawn = (data) => {
        // Don't spawn if player already exists
        if (gameApp.playerMap.has(data.user_id)) {
            return;
        }

        let playerEntity = window.pc.app.root.findByName("Player");
        let newPlayerEntity = playerEntity.clone();

        if (data.position) {
            let position = data.position;
            newPlayerEntity.rigidbody.teleport(position[0], position[1], position[2]);
        } else {
            newPlayerEntity.rigidbody.teleport(0, 5, 0);
        }

        newPlayerEntity.tags.clear();
        newPlayerEntity.tags.add(data.user_id);

        newPlayerEntity.enabled = true;
        let sceneRoot = window.pc.app.root.findByName("Root");
        sceneRoot.addChild(newPlayerEntity);

        gameApp.playerMap.set(data.user_id, newPlayerEntity);
    }

    const onPlayerMove = (data) => {
        performance.mark('move-start');
        if (data.user_id === window.pc.app.gameApp.user.user_id) {
            return;
        }
        const position = data.position;
        const playerEntity = window.pc.app.gameApp.playerMap.get(data.user_id);
        if (playerEntity) {
            const vectorPosition = new window.pc.Vec3(position[0], position[1], position[2]);
            playerEntity.script.pointAndClick.movePlayerTo(vectorPosition);
        }
        performance.mark('move-end');
        performance.measure('Player Movement', 'move-start', 'move-end');
    }

    const handleServerPerformance = (data) => {
        setServerStats(prev => ({
            ...prev,
            [data.operation]: `${(data.duration * 1000).toFixed(2)}ms`
        }));
    };

    useEffect(() => {
        window.pc.app.on("boxHit", listener);
        return () => {
            window.pc.app.off("boxHit", listener);
        }
        //   window.addEventListener("message", listener)

        //   return () => {
        //     window.removeEventListener("message", listener);
        //   }
    }, [])

    const listener = (event) => {
        // if (event.origin !== "http://localhost:3000")
        //   return;
        clearTimeout(setTimeOutRef.current);
        setIsHit(true);
        setTimeOutRef.current = setTimeout(() => {
            setIsHit(false);
        }, 2000);
    }

    return (
        <div>
            {isHit && <div className='Popup'>Touched!!!</div>}
            <div style={{ position: 'fixed', top: 10, right: 10, background: 'rgba(0,0,0,0.7)', color: 'white', padding: 10 }}>
                <h4>Client Performance</h4>
                {Object.entries(performanceStats).map(([key, value]) => (
                    <div key={key}>{key}: {value}</div>
                ))}
                <h4>Server Performance</h4>
                {Object.entries(serverStats).map(([key, value]) => (
                    <div key={key}>{key}: {value}</div>
                ))}
            </div>
        </div>
    )
}

export default PlayView