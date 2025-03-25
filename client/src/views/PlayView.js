import { useEffect, useRef, useState } from "react";

const PlayView = () => {
    const [isHit, setIsHit] = useState(false);
    const setTimeOutRef = useRef(null);

    const gameApp = window.pc.app.gameApp;
    if (!gameApp.playerMap) {
        gameApp.playerMap = new Map();
    }

    const OP_CODE_POSITION = 1;
    const OP_CODE_INITIAL_DATA = 2;
    const OP_CODE_PLAYER_SPAWN = 3;

    useEffect(() => {
        if (!gameApp) return;
        gameApp.socket.onmatchdata = (matchState) => {
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
                default:
                    break;
            }
        }

        gameApp.socket.onmatchpresence = (matchPresence) => {
            console.log('matchPresence', matchPresence);
            const match_id = matchPresence.match_id;
            const leaves = matchPresence.leaves;
            const joins = matchPresence.joins;

            if (leaves && leaves.length > 0) {
                leaves.forEach(player => destroyPlayer(player.user_id));
            }
        }

    }, [])

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
        if (data.user_id === window.pc.app.gameApp.user.user_id) {
            return;
        }
        const position = data.position;
        const playerEntity = window.pc.app.gameApp.playerMap.get(data.user_id);
        if (playerEntity) {
            const vectorPosition = new window.pc.Vec3(position[0], position[1], position[2]);
            playerEntity.script.pointAndClick.movePlayerTo(vectorPosition);
        }
    }

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
        </div>
    )
}

export default PlayView