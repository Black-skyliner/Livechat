$(function(){
    // Variables
    var socket = io.connect('http://localhost:3000'),
        room = $('#room'),
        users = $('#users'),
        groups = $('#groups'),
        message = $('#message'),
        send = $('#send'),
        p = $('<p>').addClass('message');
        span = $('<span>').addClass('username'),
        br = $('<br>'),
        token = $('#token').val(),
        username = $('#username').val(),
        page = $('#page').val();
    
    // Send message using send button
    send.click(function(e){
        sendMessage();
        e.preventDefault();
    });

    // Send message on enter press
    $(document).on('keypress', function(e) {
        if(e.which == 13){
            var useKey = $('input[name=useKey]:checked').val();
            if(useKey == 1){
                sendMessage();
                e.preventDefault();
            }
        }
    });

    // Check the message if is not empty before sending 
    function sendMessage(){
        if(message.val().length === 0)
            return false;
        socket.emit('new', { 
            token: token, 
            username: username, 
            message: message.val() 
        });
        message.val('');
        return false;
    }

    // Update
    function roomUpdate(data){
        var user = data.username,
            cls = '';
        if(data.token == token){
            user = 'Moi'
            cls = '-right';
        }
        room.append(p.clone().addClass(cls).html(data.message)
            .append(br.clone())
            .append(span.clone().html(user)))
            .animate({
                scrollTop: room[0].scrollHeight
            }, 'slow');
    }

    // Chat Message
    socket.on('new', function(data){
        roomUpdate(data);
    });

    // Sign In / Out notification
    socket.on('note', function(data){
        if(data.username != username){
            room.append(p.clone().html(data.message))
                .animate({
                    scrollTop: room[0].scrollHeight
                }, 'slow');
        }
    });
    
    // Update users list
    setTimeout(function(){
        socket.emit('RequestUsersList');
        socket.on('usersList', function(data){

            var containerUser = users.find('ul'),
                item = $('<li>').addClass('list-group-item'),
                containerGroup = groups.find('ul');
                containerUser.html('');
            // List of users
            data.users.forEach(function(user){
                if(token != user.token){
                    var fullname = user.lastname + ' ' + user.firstname,
                        link = $('<a>').attr('href', '#').addClass('user').text(fullname);

                    // Add checkboxs to users list when group form is called
                    if(page != 'index'){
                        var input = $('<input>').attr({
                                    'type': 'checkbox',
                                    'name': 'invitedUsers',
                                    'value': user.token
                                }).addClass('form-check-input').text(fullname),
                            label = $('<label>').addClass('form-check-label').text(fullname);
                        
                        link = $('<div>').addClass('form-check').append(input, label);
                    }
                    containerUser.append(item.clone().append(link));
                }
            });
            
            // List of groups
            containerGroup.html('');
            data.groups.forEach(function(group){
                var link = $('<a>').attr('href', '#').addClass('group').text(group.name);
                containerGroup.append(item.clone().append(link));
            });
            
            // Display connection message
            if(data.action && data.action === 'connect') {
                data.messageHistory.forEach(function(msg){
                    roomUpdate(msg);
                });
            }
        }, 2000);
    });
});