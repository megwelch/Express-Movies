// Express docs: http://expressjs.com/en/api.html
const express = require('express')
// Passport docs: http://www.passportjs.org/docs/
const passport = require('passport')

// pull in Mongoose model for examples
const Movie = require('../models/movie')

// this is a collection of methods that help us detect situations when we need
// to throw a custom error
const customErrors = require('../../lib/custom_errors')

// we'll use this function to send 404 when non-existant document is requested
const handle404 = customErrors.handle404
// we'll use this function to send 401 when a user tries to modify a resource
// that's owned by someone else
const requireOwnership = customErrors.requireOwnership

// this is middleware that will remove blank fields from `req.body`, e.g.
// { example: { title: '', text: 'foo' } } -> { example: { text: 'foo' } }
const removeBlanks = require('../../lib/remove_blank_fields')
// passing this as a second argument to `router.<verb>` will make it
// so that a token MUST be passed for that route to be available
// it will also set `req.user`
const requireToken = passport.authenticate('bearer', { session: false })

// instantiate a router (mini app that only handles routes)
const router = express.Router()


//* INDEX
//* /pets
router.get('/movies', requireToken, (req, res, next) => {
    Movie.find()
        .then(movies => {
            return movies.map(movie => movie)
        })
        .then(movies => {
            res.status(200).json({ movies: movies })
        })
        .catch(next)
})

//* SHOW
//* /pets/:id
router.get('/movies/:id', requireToken, (req, res, next) => {
    Movie.findById(req.params.id)
    .then(handle404)
    .then(movie => {
        res.status(200).json({ movie: movie})
    })
    .catch(next)
})

//* CREATE
//* /movies
router.post('/movies', requireToken, (req, res, next) => {
    req.body.movie.owner = req.user.id

    // on the front end, I HAVE to send a pet as the top level key
    Movie.create(req.body.movie)
    .then(movie => {
        res.status(201).json({ movie: movie })
    })
    .catch(next)
    // ^^^ shorthand for:
        //^ .catch(error => next(error))
})

//* DESTROY
router.delete('/movies/:id', requireToken, (req, res, next) => {
	Movie.findById(req.params.id)
		.then(handle404)
		.then((movie) => {
			// throw an error if current user doesn't own `pet`
			requireOwnership(req, movie)
			// delete the pet ONLY IF the above didn't throw
			movie.deleteOne()
		})
		// send back 204 and no content if the deletion succeeded
		.then(() => res.sendStatus(204))
		// if an error occurs, pass it to the handler
		.catch(next)
})

module.exports = router