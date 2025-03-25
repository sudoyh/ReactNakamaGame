import { useState } from "react";
import { Client } from "@heroiclabs/nakama-js";

const LoginView = ({ setStep }) => {

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [username, setUsername] = useState("");


    const handleSubmit = async (e) => {
        e.preventDefault();
        var useSSL = false; // Enable if server is run with an SSL certificate.
        var client = new Client("defaultkey", "127.0.0.1", "7350", useSSL);

        try {
            const session = await client.authenticateEmail(email, password, true, username)
            // console.log('session', session);

            const socket = client.createSocket();
            let appearOnline = true;
            let connectionTimeout = 30;

            await socket.connect(session, appearOnline, connectionTimeout);
            // console.log('socket result', socketResult);
            // const match = await socket.createMatch();
            // // console.log('match', match);

            // const matchId = match.match_id;
            // const result = await socket.joinMatch(matchId);
            // console.log('result', result);

            const { payload } = await socket.rpc('create_match_rpc')

            const { match_id, self } = await socket.joinMatch(payload);
            window.pc.app.gameApp = {};
            window.pc.app.gameApp.client = client;
            window.pc.app.gameApp.socket = socket;
            window.pc.app.gameApp.match_id = match_id;
            window.pc.app.gameApp.user = self;
            window.pc.app.gameApp.username = username;

            await socket.sendMatchState(match_id, 3, JSON.stringify({ user_id: self.user_id }));

            setStep(1);
        } catch (error) {
            console.log('error', error);
        }
    }

    return (
        <div>
            <form onSubmit={handleSubmit} style={{ pointerEvents: 'auto' }}>
                <input placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
                <input placeholder="Username" type="text" value={username} onChange={e => setUsername(e.target.value)} />
                <button type="submit">로그인</button>
            </form>
        </div>
    )
}

export default LoginView