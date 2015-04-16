var express = require('express');
var router = express.Router();

module.exports = router;




// =========================================================
// =
// =   SET UP MONGODB AND MONGOOSE
// =

// MongoDB is a JavaScript-oriented database.
// http://docs.mongodb.org/manual/core/crud-introduction/

// --> In Cloud9, you need to start MongoDB before running your app by typing 
// ./mongod 
// at the terminal ("bash" window). But you only need to do that once per workspace. 
// MongoDB should run forever after that.

// Mongoose makes it easy to access MongoDB using a pattern of "models".
// http://mongoosejs.com

// Use Mongoose to connect to the MongoDB database. We'll call our
// database "networks". It will be created automatically if it doesn't already exist.

var mongoose = require('mongoose');
mongoose.connect(process.env.MONGOLAB_URI || ('mongodb://' + process.env.IP + '/networks'));




// =========================================================
// =
// =   DEFINE OUR DATA MODELS
// =

// Define the data structure of a Book model
// Allowed data types (Number, String, Date...): http://mongoosejs.com/docs/schematypes.html

var Book = mongoose.model('Book', {
  title: {type: String, required: true},
  author: {type: String, required: true},
  student: {type: String, required: true},
  created: {type: Date, default: Date.now}
});





// =========================================================
// =
// =   WEB ROUTES
// =


// HOME PAGE
// /
// Shows _all_ the books

router.get('/', function(request, response, toss) {
  
  // When the server receives a request for "/", this code runs

  // Find all the Book records in the database
  Book.find().sort({_id: -1}).exec(function(err, books) {
    // This code will run once the database find is complete.
    // books will contain a list (array) of all the books that were found.
    // err will contain errors if any.

    // If there's an error, tell Express to do its default behavior, which is show the error page.
    if (err) return toss(err);
    
    // The list of shapes will be passed to the template.
    // Any additional variables can be passed in a similar way (response.locals.foo = bar;)
    response.locals.books = books;
    
    // layout tells template to wrap itself in the "layout" template (located in the "views" folder).
    response.locals.layout = 'layout';

    // Render the "home" template (located in the "views" folder).
    response.render('home');

  });
  
});




// SHOW PAGE FOR A BOOK.
// /book?title=abc
// Loos up by title so it may be _multiple_ book records

router.get('/book', function(request, response, toss) {
  
  // When the server receives a request for "/show", this code runs
  
  // Find books by title
  Book.find({title: request.query.name}).sort({_id: -1}).exec(function(err, books) {
    // This code will run once the database find is complete.
    // books will contain the found books.
    // err will contain errors if any (for example, no such record).

    if (err) return toss(err);
    
    response.locals.books = books;
    response.locals.title = request.query.name;
    response.locals.layout = 'layout';
    response.render('book');
    
  });
  
});



// NEW PAGE FOR A BOOK
// /book/new

router.get('/book/new', function(request, response) {

  // When the server receives a request for "/book/new", this code runs
  
  // Just render a basic HTML page with a form. We don't need to pass any variables.

  response.locals.layout = 'layout';
  response.render('book_new');
  
  // Please see views/new.hbs for additional comments
  
});



// CREATE PAGE FOR A BOOK
// /book/create
// Normally you get to this page by clicking "Submit" on the /book/new page, but
// you could also enter a URL like the above directly into your browser.

router.get('/book/create', function(request, response, toss) {
  
  // When the server receives a request for "/book/create", this code runs
  
  response.locals.layout = 'layout';

  // Make a new Book in memory, with the parameters that come from the URL 
  // ?width=25&height=25&top=25&left=25&color=#ff0000
  // and store it in the shape variable
  var book = new Book({
    title: request.query.title,
    author: request.query.author,
    student: request.query.student
  });
  
  // Now save it to the database
  book.save(function(err) {
    // This code runs once the database save is complete

    // An err here can be due to validations
    if (err) return toss(err);
    
    // Otherwise render a "thank you" page
    response.locals.book = book;
    response.render('book_create');
    
    // Alternatively we could just do
    // response.redirect('/');
    // to send the user straight to the homepage after saving the new shape

  });
  
});


// SHOW PAGE FOR A STUDENT
// /student?name=Ben
// Shows all the books for a student

router.get('/student', function(request, response, toss) {
  
  // When the server receives a request for "/student", this code runs

  // Find all the Book records in the database, filtered to a student name
  Book.find({student: request.query.name}).sort({_id: -1}).exec(function(err, books) {
    // This code will run once the database find is complete.
    // books will contain a list (array) of all the books that were found.
    // err will contain errors if any.

    // If there's an error, tell Express to do its default behavior, which is show the error page.
    if (err) return toss(err);
    
    // The list of shapes will be passed to the template.
    // Any additional variables can be passed in a similar way (response.locals.foo = bar;)
    response.locals.books = books;
    response.locals.student = request.query.name;

    // layout tells template to wrap itself in the "layout" template (located in the "views" folder).
    response.locals.layout = 'layout';

    // Render the "home" template (located in the "views" folder).
    response.render('student');

  });
  
});


// SHOW PAGE FOR AN AUTHOR
// /student?name=
// Shows all the books for an author

router.get('/author', function(request, response, toss) {
  
  // When the server receives a request for "/student", this code runs

  // Find all the Book records in the database, filtered to a student name
  Book.find({author: request.query.name}).sort({_id: -1}).exec(function(err, books) {
    // This code will run once the database find is complete.
    // books will contain a list (array) of all the books that were found.
    // err will contain errors if any.

    // If there's an error, tell Express to do its default behavior, which is show the error page.
    if (err) return toss(err);
    
    // The list of shapes will be passed to the template.
    // Any additional variables can be passed in a similar way (response.locals.foo = bar;)
    response.locals.books = books;
    response.locals.author = request.query.name;

    // layout tells template to wrap itself in the "layout" template (located in the "views" folder).
    response.locals.layout = 'layout';

    // Render the "home" template (located in the "views" folder).
    response.render('author');

  });
  
});


// ABOUT PAGE
// /about

router.get('/about', function(request, response) {

  // When the server receives a request for "/about", this code runs

  response.locals.layout = 'layout';
  response.render('about');
  
});


