let messages = [];

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
        if (messages.length >= 5) {
          let first = messages.shift();
          first.classList.remove('first-child');
          first.parentNode.removeChild(first);
        }
        let chatmsg = document.createElement('div');
        chatmsg.id = 'chatmsg';
        chatmsg.innerHTML = `${username}: ${message}`;
        document.querySelector('#chatmsgs').appendChild(chatmsg);
        messages.push(chatmsg);
    }
}

main();