var express = require('express');
var router = express.Router();
var moment = require('moment');
var cas = require('grand_master_cas');

module.exports = router;

var hostname = process.env.C9_HOSTNAME || "localhost:3000";



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

var LoanSchema = new mongoose.Schema({
  student: {type: String, required: true},
  created: {type: Date, default: Date.now},
  returned: {type: Date}
});
LoanSchema.methods.isActive = function() {
  return !this.returned;
};

var BookSchema = new mongoose.Schema({
  title: {type: String, required: true},
  author: {type: String, required: true},
  student: {type: String, required: true},
  created: {type: Date, default: Date.now},
  loans: [LoanSchema]
});

BookSchema.methods.isOnLoan = function() {
  for (var i = 0; i < this.loans.length; i++) {
    if (this.loans[i].isActive()) return true;
  }
  return false;
};


// See http://momentjs.com/docs/#/displaying/format/ for format options
BookSchema.methods.created_formatted = function() {
  return moment(this.created).subtract(4, "hours").format("MMMM D, YYYY [at] h:mm a");
}


var Book = mongoose.model('Book', BookSchema);




// =========================================================
// =
// =   SET UP CAS (FOR YALE USER AUTHENTICATION)
// =

cas.configure({
  casHost: "secure.its.yale.edu",             // required
  ssl: true,                                  // default false, Yale requires true
  service: 'https://' + hostname + '/',       // Absolute URL to where cas.bouncer should take you after successful login.
  redirectUrl: '/about',                      // the route that cas.blocker will send to if not authed. Defaults to '/'
  sessionName: 'username'                     // get the netID from request.session.whatever - cas_user by default.
});




// =========================================================
// =
// =   WEB ROUTES
// =


// HOME PAGE
// /
// Shows _all_ the books

router.get('/', cas.bouncer, function(request, response, toss) {
  
  // When the server receives a request for "/", this code runs

  // Find all the Book records in the database
  Book.find(function(err, books) {
    // This code will run once the database find is complete.
    // books will contain a list (array) of all the books that were found.
    // err will contain errors if any.
    
    // If there's an error, tell Express to do its default behavior, which is show the error page.
    if (err) return toss(err);
    
    response.locals.events = eventsFromBooks(books);
    
    // layout tells template to wrap itself in the "layout" template (located in the "views" folder).
    response.locals.layout = 'layout';

    // Render the "home" template (located in the "views" folder).
    response.render('home');

  });
  
});


// SHOW PAGE FOR A BOOK BY TITLE
// /book?title=abc
// Loos up by title so it may be _multiple_ book records

router.get('/book', cas.blocker, function(request, response, toss) {
  
  // When the server receives a request for "/show", this code runs
  
  // Find books by title
  Book.find({title: request.query.name}).sort({_id: -1}).exec(function(err, books) {
    // This code will run once the database find is complete.
    // books will contain the found books.
    // err will contain errors if any (for example, no such record).

    if (err) return toss(err);
    
    for (var i = 0; i < books.length; i++) {
      books[i].onLoan = books[i].isOnLoan();
      books[i].events = eventsFromBooks([books[i]]);
    }

    response.locals.books = books;
    response.locals.title = request.query.name;
    response.locals.layout = 'layout';
    response.render('book');
    
  });
  
});



// NEW PAGE FOR A BOOK
// /book/new

router.get('/book/new', cas.blocker, function(request, response) {

  // When the server receives a request for "/book/new", this code runs
  
  // Just render a basic HTML page with a form. We don't need to pass any variables.

  response.locals.layout = 'layout';
  response.locals.username = request.session.username;
  response.render('book_new');
  
  // Please see views/new.hbs for additional comments
  
});



// CREATE PAGE FOR A BOOK
// /book/create
// Normally you get to this page by clicking "Submit" on the /book/new page, but
// you could also enter a URL like the above directly into your browser.

router.get('/book/create', cas.blocker, function(request, response, toss) {
  
  // When the server receives a request for "/book/create", this code runs
  
  response.locals.layout = 'layout';

  // Make a new Book in memory, with the parameters that come from the URL 
  // ?width=25&height=25&top=25&left=25&color=#ff0000
  // and store it in the shape variable
  var book = new Book({
    title: request.query.title,
    author: request.query.author,
    student: request.session.username
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


// CREATE PAGE FOR A LOAN
// /loan/create?book_id=123
// Normally you get to this page by clicking "Borrow",
// you could also enter a URL like the above directly into your browser.

router.get('/loan/create', cas.blocker, function(request, response, toss) {

  // When the server receives a request for "/loan/create", this code runs
  
  // Find the book we're loaning
  Book.findOne({_id: request.query.book_id}, function(err, book) {
    // This code runs once the book has been found
    if (err) return toss(err);
    
    // Create the loan in memory
    book.loans.push({
      student: request.session.username
    });
    
    // Save the book (also saves the loan)
    book.save(function(err) {
      // This code runs once the database save is complete
  
      // An err here can be due to validations
      if (err) return toss(err);
      
      // Don't render a "thank you" page; instead redirect to the homepage
      response.redirect('/');
      
    });
    
  });
    
});


// RETURN PAGE FOR A LOAN
// /loan/return?book_id=123
// Since a book could have multiple loans, returns any active loans for this book. In theory just one should be active.
// NOTE: This allows anyone to return the book, not just the borrower. Restricting to just the borrower would be easy if desired.

router.get('/loan/return', cas.blocker, function(request, response, toss) {

  // When the server receives a request for "/loan/return", this code runs
  
  // Find the book we're returning
  Book.findOne({_id: request.query.book_id}, function(err, book) {
    // This code runs once the book has been found
    if (err) return toss(err);
    
    // Return any active loans
    for (var i = 0; i < book.loans.length; i++) {
      if (book.loans[i].isActive()) {
        book.loans[i].returned = Date.now();
      }
    }

    // Save the book (also saves the loans)
    book.save(function(err) {
      // This code runs once the database save is complete
  
      // An err here can be due to validations
      if (err) return toss(err);
      
      // Don't render a "thank you" page; instead redirect to the homepage
      response.redirect('/');
      
    });
    
  });
    
});


// SHOW PAGE FOR A STUDENT
// /student?name=Ben
// Shows all the books for a student

router.get('/student', cas.blocker, function(request, response, toss) {
  
  // When the server receives a request for "/student", this code runs

  // Find all the Book records in the database, filtered to a student name
  Book.find({student: request.query.name}).sort({_id: -1}).exec(function(err, books) {
    // This code will run once the database find is complete.
    // books will contain a list (array) of all the books that were found.
    // err will contain errors if any.

    // If there's an error, tell Express to do its default behavior, which is show the error page.
    if (err) return toss(err);

    getEventsFromStudent(request.query.name, function(err, events) {
      if (err) return toss(err);

      response.locals.events = events;
      response.locals.books = books;
      response.locals.student = request.query.name;
  
      // layout tells template to wrap itself in the "layout" template (located in the "views" folder).
      response.locals.layout = 'layout';
  
      // Render the "home" template (located in the "views" folder).
      response.render('student');
      
    });
    
  });
  
});


// SHOW PAGE FOR AN AUTHOR
// /student?name=
// Shows all the books for an author

router.get('/author', cas.blocker, function(request, response, toss) {
  
  // When the server receives a request for "/student", this code runs

  // Find all the Book records in the database, filtered to a student name
  Book.find({author: request.query.name}).sort({_id: -1}).exec(function(err, books) {
    // This code will run once the database find is complete.
    // books will contain a list (array) of all the books that were found.
    // err will contain errors if any.

    // If there's an error, tell Express to do its default behavior, which is show the error page.
    if (err) return toss(err);

    for (var i = 0; i < books.length; i++) {
      books[i].onLoan = books[i].isOnLoan();
      books[i].loanClass = '';
      if (books[i].onLoan) {
        books[i].loanClass = 'on-loan';
      }
      books[i].events = eventsFromBooks([books[i]]);
    }
    
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



// Take a list of books and return a list of books, loans, and returns, sorted by date
function eventsFromBooks(books) {
  var events = [];
  for (var i = 0; i < books.length; i++) {
    var book = books[i];
    book.isBook = true;
    book.onLoan = book.isOnLoan();
    book.loanClass = '';
    if (book.onLoan) {
      book.loanClass = 'on-loan';
    }
    events.push(book);
    for (var j = 0; j < book.loans.length; j++) {
      var loan = book.loans[j];
      loan.isLoan = true;
      loan.book = book;
      events.push(loan);
      if (loan.returned) {
        events.push({
          isReturn: true,
          book: book,
          student: loan.student,
          created: loan.returned
        });
      }
    }
  }
  events.sort(function(a, b) {
    if (a.created > b.created) return -1;
    if (a.created < b.created) return 1;
    return 0;
  });
  return events;
}

// Take a student a return a list of loans and returns, sorted by date
function getEventsFromStudent(student, callback) {
  console.log("eventsFromStudent", student);
  Book.find(function(err, books) {
    if (err) {
      return callback(err);
    }
    var events = [];
    for (var i = 0; i < books.length; i++) {
      var book = books[i];
      book.isBook = true;
      book.onLoan = book.isOnLoan();
      book.loanClass = '';
      if (book.onLoan) {
        book.loanClass = 'on-loan';
      }
      for (var j = 0; j < book.loans.length; j++) {
        var loan = book.loans[j];
        console.log(loan.student);
        if (loan.student == student) {
          loan.isLoan = true;
          loan.book = book;
          events.push(loan);
          if (loan.returned) {
            events.push({
              isReturn: true,
              book: book,
              student: loan.student,
              created: loan.returned
            });
          }
        }
      }
    }
    events.sort(function(a, b) {
      if (a.created > b.created) return -1;
      if (a.created < b.created) return 1;
      return 0;
    });
    callback(null, events);
  });
}
