
async function main () {
    const socket = new WebSocket('wss://irc-ws.chat.twitch.tv:443');

    let chat_msg = /^@.*:(\w+)!\w+@\w+\.tmi\.twitch\.tv PRIVMSG #\w+ :/;
    let data = await fetch('tokens.json').then(res => res.json());
    let password = data['twitch_bot_token'];
    let channel = data['channel'];

    socket.onopen = () => {
        socket.send(`PASS ${password}`);
        socket.send(`NICK ${channel}`);
        socket.send(`JOIN #${channel}`);
        socket.send('CAP REQ :twitch.tv/tags');
    }

    socket.onmessage = function (event) {
        console.log(event.data);
        if (event.data.startsWith('PING :tmi.twitch.tv')) {
            return socket.send('PONG :tmi.twitch.tv');
        }
        match = chat_msg.exec(event.data);
        if (match === null) {
            return;
        }
        message = event.data.replace(chat_msg, "");
        username = match[1];
        console.log(`${username}: ${message}`);
        let elem = document.createElement('div');
        elem.style.cssText = 'width:300px;height:100px;background:#ff1493';
        elem.innerHTML = `${username}: ${message}`;
        document.body.appendChild(elem);
    }
}

main();