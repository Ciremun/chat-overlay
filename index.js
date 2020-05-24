let messages = [];
let max_messages = 10;
let badges = true;
const socket = new WebSocket('wss://irc-ws.chat.twitch.tv:443');

async function main () {

    let chat_msg = /^@.*:(\w+)!\w+@\w+\.tmi\.twitch\.tv PRIVMSG #\w+ :/,
        data = await fetch('tokens.json').then(res => res.json()),
        password = data['twitch_bot_token'],
        channel = data['channel'];

    socket.onopen = () => {
        socket.send(`PASS ${password}`);
        socket.send(`NICK ${channel}`);
        socket.send(`JOIN #${channel}`);
        socket.send('CAP REQ :twitch.tv/tags');
    }

    socket.onmessage = async function (event) {
        console.log(event.data);
        if (event.data.startsWith('PING :tmi.twitch.tv')) return socket.send('PONG :tmi.twitch.tv');
        let username = /display-name=(\w+);/.exec(event.data);
        if (!username) return;
        username = username[1];
        let color = /color=(#[A-Fa-f0-9]{6})/.exec(event.data)[1];
        let message = event.data.replace(chat_msg, "");
        if (messages.length >= max_messages) {
            let first = messages.shift();
            first.addEventListener('animationend', () => first.parentNode.removeChild(first));
            first.style.animation = 'fade-out 0.2s forwards';
          }
        let chatmsg = document.createElement('div');
        let tags = {};
        event.data.split(';').forEach(x => {x = x.split('='); tags[x[0]] = x[1];});
        if (badges) {
            tags.badges = tags.badges.split(',').map(x => x.split('/'));
            tags.badges.forEach(x => chatmsg.innerHTML += `<img id="badge" src="static/${x[0]}${x[1]}.png">`);
        }
        chatmsg.id = 'chatmsg';
        chatmsg.innerHTML += `<span style=color:${color}>${username}</span> ${message}`;
        document.querySelector('#chatmsgs').appendChild(chatmsg);
        messages.push(chatmsg);
    }
}

main();