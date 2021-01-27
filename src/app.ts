import express, { Request, Response, NextFunction, Application } from 'express';   
import graphqlExpress, { graphqlHTTP }  from 'express-graphql'; 
import schema from './graphql/schema'; 
import refs from './utils/refs';
import resolver from './graphql/resolver'; 
import mongoose from 'mongoose';
import User from './models/user'; 
import { getUser, getGuilds, token } from './utils/auth2';
import user from './models/user';
import bodyParser from 'body-parser'; 
mongoose.connect('mongodb://localhost/dashboardv2'); 
mongoose.connection.on('connected', () => {
    console.log('mongoose connected');
}) 

const app: Application = express();
app.use(bodyParser.json());
app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); 
    res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS, GET, POST'); 
    if (req.method  === 'OPTIONS') { 
        return res.sendStatus(200); 
    }
    next(); 
})
app.get('/auth2', (req: Request, res: Response, next: NextFunction) => {
    res.redirect(refs.redirect); 
})
app.use('/auth2/callback', async (req: Request, res: Response, next: NextFunction) => {
    const authToken = await token(req.query.code as string); 
    if (authToken.error) { 
        return res.redirect('http://localhost:8080');
    }
    const guilds = await getGuilds(authToken.access_token);
    const users = await getUser(authToken.access_token);
    const isUser: any = await User.findOne({id: users.id});
    console.log(users);
    if (isUser) { 
        isUser.avatar! = users.avatar;
        isUser.username! = users.username; 
        isUser.discrimintor! = users.discriminator; 
        isUser.save(); 
    } else { 
        const newUser = new User({
            id: users.id, 
            avatar: users.avatar, 
            discriminator: users.discriminator, 
            guilds: guilds
        })
        newUser.save(); 
    }
    res.cookie('token', { 
        access_token: authToken.access_token, 
        refresh_token: authToken.refresh_token
    }); 
    res.cookie('userid', users.id);
    return res.redirect('http://localhost:8080/login');  
})
app.use('/graphql', graphqlHTTP({ 
    schema: schema, 
    rootValue: resolver, 
    graphiql: true
}))

app.listen(3000,  () => console.log('app running')); 
``