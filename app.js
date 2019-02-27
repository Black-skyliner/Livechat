const express = require('express')
const app = express()

var session = require('express-session'),
    bodyParser = require('body-parser'),
    mysql = require('mysql'),
    md5 = require('md5')

var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'kheops',
    database: 'RG'
});

server = app.listen(3000)
const io = require("socket.io")(server)

app.use(session({
    secret: 'RG',
    resave: false,
    saveUninitialized: true,
}))

var messageHistory = []
var users = []
var groups = []

app.set('view engine', 'ejs')
app.use(express.static('public'))

app.use(bodyParser.urlencoded({
    extended: false
}))

app.get('/', (request, response) => {
    response.redirect('/chat')
})

// Create new group
app.post('/group/create', (request, response) => {
    let token = md5([
                request.body.name.trim(), 
                Math.round((new Date()).getTime()/1000)
            ].join(':')
        ),
        group = {
            token: token,
            name: request.body.name.trim(),
            users: request.body.invitedUsers
        }
    groups.push(group)    
    response.redirect('/chat')
})

app.get('/group/new', (request, response) => {
    render(request, response, 'group.ejs')
})

app.get('/login', (request, response) => {
    response.render('login.ejs')
})

app.get('/chat', (request, response) => {
    render(request, response, 'index.ejs')
})

// Check the user if is connected and render index page
var  render = function(req, res, tpl){
    if (req.session && req.session.user != null){
        let user = undefined
        users.forEach((u) => {
            if(u.token == req.session.user)
                user = u
        })
        if(user == undefined) {
            req.session.destroy()
            res.redirect('/login')
        }
        res.render(tpl, {
            token: user.token,
            username : user.username()
        })
    }else{
        res.redirect('/login')
    }
}

// Logout function
app.get('/disconnect', (request, response) => {
    if (request.session && request.session.user != null){
        let username = undefined
        users.forEach((u, index, object) => {
            if(u.token == request.session.user) {
                username = u.username()
                object.splice(index, 1)
            }
        })
        request.session.destroy()
        io.sockets.emit('note', {
            message: username + ' vient de se déconnecter.'
        })
        io.sockets.emit('usersList', {
            action: 'disconnect',
            users: users
        })
    }
    response.redirect('/login')
})

app.post('/chat', (request, response) => {
    let email = request.body.email.trim(),
        password = request.body.password.trim()

    if (request.session.user == undefined){
        connection.query('SELECT * FROM `ps_customer` WHERE `active` = 1 AND `email` = ?', [email], (error, results, fields) =>{
            if(Array.isArray(results) && results.length){
                Object.keys(results).forEach((key) => {
                    let row = results[key]

                    if(password == row.spsw){
                        let token = md5(row.email)
                            user = {
                                token: token,
                                firstname: row.firstname,
                                lastname: row.lastname,
                                group: 0,
                                time: new Date().getTime(),
                                username : function() {
                                    return this.lastname  + ' ' + this.firstname 
                                }
                            }
                        users.push(user)

                        request.session.user = token
                        request.session.save()
                        
                        io.sockets.emit('note', {
                            message: user.username() + ' vient de se connecter.',
                            messageHistory: messageHistory
                        })
                        
                        response.render('index.ejs', {
                            token: user.token,
                            username : user.username()
                        })
                    }else{
                        response.redirect('/')
                    }
                })

            }else{
                response.redirect('/')
            }
        })
    }else{
        response.redirect('/')
    }
})

io.on('connection', (socket) => {

    // Message Listner
    socket.on('new', (data) => {
        messageHistory.push({
            token: data.token,
            username: data.username,
            message: data.message
        });
        
        // Boradcast message to users
        io.sockets.emit('new', {
            token: data.token,
            username: data.username,
            message: data.message
        })
    })

    // Emit users list
    socket.on('RequestUsersList', (data) => {
        io.sockets.emit('usersList', {
            users: users,
            groups: groups
        })
        io.sockets.connected[socket.id].emit('usersList', {
            action: 'connect',
            users: users,
            groups: groups,
            messageHistory: messageHistory
        })
    })
})