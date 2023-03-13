module.exports = {

    userAuthenticated: (req, res, next)=>{
        if(req.isAuthenticated()){
            return next();
        } 
        req.flash('error_message', 'You have to be logged in');
        res.redirect('/login');
    }
}