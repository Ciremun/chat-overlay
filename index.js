let max_messages = 10;
let ignoredUsers = ['shtcd'];
let badges = true;
let bttv = true;
let ffz = true;

let messages = [];
const socket = new WebSocket('wss://irc-ws.chat.twitch.tv:443');

function processEmotes(tags, message) {
    let newmsg = message,
        id = 'emote',
        totalCount = 0,
        toReplace = [],
        src,
        regex,
        emote;
    if (tags.emotes) {
        let emotes = {};
        tags.emotes.split('/').forEach(x => {
            x = x.split(':');
            emotes[x[0]] = x[1].split(',');
        });
        Object.keys(emotes).forEach(x => {
            y = emotes[x][0].split('-').map(z => parseInt(z));
            emote = message.substring(y[0], y[1] + 1);
            regex = new RegExp(`${emote}\\s\|\\s${emote}\\s\|\\s${emote}\$`, 'g');
            src = `http://static-cdn.jtvnw.net/emoticons/v1/${x}/3.0`;
            totalCount += emotes[x].length;
            toReplace.push({
                'regex': regex,
                'src': src
            });
        });
    }
    if (bttv) {
        let bttvEmotes = window.bttvEmotes;
        if (bttvEmotes.length === 0) console.log('bttvEmotes is empty, no bttv emotes for current msg');
        else {
            let count;
            for (j = 0; j < bttvEmotes.length; j++) {
                emote = bttvEmotes[j].code;
                regex = new RegExp(`${emote}\\s\|\\s${emote}\\s\|\\s${emote}\$`, 'g');
                count = (message.match(regex) || []).length;
                if (count === 0) continue;
                totalCount += count;
                src = `https://cdn.betterttv.net/emote/${bttvEmotes[j].id}/3x`;
                toReplace.push({
                    'regex': regex,
                    'src': src
                });
            }
        }
    }
    if (ffz) {
        let ffzEmotes = window.ffzEmotes;
        if (ffzEmotes.length === 0) console.log('ffzEmotes is empty, no ffz emotes for current msg');
        else {
            let count;
            for (j = 0; j < ffzEmotes.length; j++) {
                emote = ffzEmotes[j].name;
                regex = new RegExp(`${emote}\\s\|\\s${emote}\\s\|\\s${emote}\$`, 'g');
                count = (message.match(regex) || []).length;
                if (count === 0) continue;
                totalCount += count;
                src = ffzEmotes[j].urls[4];
                toReplace.push({
                    'regex': regex,
                    'src': src
                });
            }
        }
    }
    if (toReplace.length) {
        if ((bttv || ffz) && message.split(' ').length === totalCount) id = 'emoteonly';
        else if (tags['emote-only'] === '1') id = 'emoteonly';
        toReplace.forEach(x => newmsg = newmsg.replace(x.regex, ` <img id="${id}" alt="" src="${x.src}"> `));
    }
    return newmsg;
}

async function fetchFFZEmotes(data) {
    let ffz = [];
    let response = await fetch(`https://api.frankerfacez.com/v1/room/${data['channel']}`);
    let json = await response.json();
    try {
        let set = json.room.set;
        ffz = json.sets[`${set}`].emoticons;
    } catch (e) {
        console.log('unable to fetch ffz emotes');
    }
    return ffz;
}

async function fetchBttvEmotes(data) {
    let channel_id = data['channel_id'];
    let channel = data['channel'];
    let auth = data['twitch_bot_token'];
    if (channel_id === undefined) {
        if (data['client_id'] === undefined) {
            console.log('unable to fetch bttv emotes, put channel/client id into tokens.json');
            return;
        }
        let response = await fetch(`https://api.twitch.tv/helix/users?login=${channel}`, {
            headers: {
                'Client-ID': data['client_id'],
                'Authorization': `Bearer ${auth}`
            }
        });
        let json = await response.json();
        json = json['data'][0];
        if (json === undefined) {
            console.log('unable to fetch channel id');
            return;
        }
        channel_id = json['id'];
        console.log(`channel_id - ${channel_id}`);
    }
    let bttv = [];
    let response;
    let json;
    try {
        response = await fetch(`https://api.betterttv.net/3/cached/users/twitch/${channel_id}`);
        json = await response.json();
        bttv = json['channelEmotes'].concat(json['sharedEmotes']);
    } catch (e) {
        console.log('unable to fetch bttv channel emotes');
    }
    try {
        response = await fetch('https://api.betterttv.net/3/cached/emotes/global');
        json = await response.json();
        if (!Array.isArray(json)) throw e;
        bttv = bttv.concat(json);
    } catch (e) {
        console.log('unable to fetch bttv global emotes');
    }
    return bttv;
}

async function main() {

    let chat_msg = /^@.*:(\w+)!\w+@\w+\.tmi\.twitch\.tv PRIVMSG #\w+ :/,
        data = await fetch('tokens.json').then(res => res.json()),
        password = `oauth:${data['twitch_bot_token']}`,
        channel = data['channel'];

    if (bttv) fetchBttvEmotes(data).then(r => window.bttvEmotes = r);
    if (ffz) fetchFFZEmotes(data).then(r => window.ffzEmotes = r);

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
        if (ignoredUsers.includes(username.toLowerCase())) return;
        let color = /color=(#[A-Fa-f0-9]{6})/.exec(event.data)[1];
        let message = event.data.replace(chat_msg, "");
        if (messages.length >= max_messages) {
            let first = messages.shift();
            first.addEventListener('animationend', () => first.parentNode.removeChild(first));
            first.style.animation = 'fade-out 0.2s forwards';
        }
        let chatmsg = document.createElement('div');
        let tags = {};
        event.data.split(';').forEach(x => {
            x = x.split('=');
            tags[x[0]] = x[1];
        });
        if (badges && tags.badges) {
            tags.badges = tags.badges.split(',').map(x => x.split('/'));
            tags.badges.forEach(x => chatmsg.innerHTML += `<img id="badge" alt="" src="static/${x[0]}${x[1]}.png">`);
        }
        message = processEmotes(tags, message);
        chatmsg.id = 'chatmsg';
        chatmsg.innerHTML += `<span style=color:${color}>${username}</span> ${message}`;
        document.querySelector('#chatmsgs').appendChild(chatmsg);
        messages.push(chatmsg);
    }
}

main();