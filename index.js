const env = require('dotenv').config()
const express = require('express')
const cors = require('cors')

const app = express()
const port = process.env.PORT || 3000


app.use(cors())
app.use(express.json())

app.get('/api/recipes', async (req, res) => {
    const query = req.query.query
    const number = parseInt(req.query.number) || 60
    const offset = parseInt(req.query.offset) || 0
    const random = req.query.random === 'true'
    const apiKey = process.env.SPOONACULAR_API_KEY

    if(!query){
        return res.status(400).json({error: 'Missing Query'})
    }
    try{
        let apiUrl = `https://api.spoonacular.com/recipes/complexSearch?query=${query}&number=${number}&apiKey=${apiKey}`

        if(random){
          apiUrl += '&sort=random'
        } else {
           apiUrl += `&offset=${offset}`
        }
        const response = await fetch(apiUrl)
        const data = await response.json()
        res.json(data)
    } catch (error){
        console.error('Error fetching Recipes')
        res.status(500).json({error: 'something went wrong'})
    }
})

app.get('/api/recipes/:id/instructions', async (req, res) => {
  const { id } = req.params
  const apiKey = process.env.SPOONACULAR_API_KEY

  if (!id) {
    return res.status(400).json({ error: 'Missing recipe id' })
  }

  try {
    const response = await fetch(`https://api.spoonacular.com/recipes/${id}/analyzedInstructions?apiKey=${apiKey}`)

    if (!response.ok) {
      return res.status(502).json({ error: 'Failed to fetch instructions' })
    }

    const data = await response.json()

    if (!data || data.length === 0 || !data[0].steps) {
      return res.status(404).json({ error: 'No instructions for this recipe' })
    }

    const steps = data[0].steps.map(step => ({
      number: step.number,
      step: step.step
    }))

    const ingredientSet = new Set()
    data[0].steps.forEach(step => {
      step.ingredients.forEach(ingredient => {
        ingredientSet.add(ingredient.name)
      })
    })

    const ingredients = [...ingredientSet]
    res.json({
      instructions: steps,
      ingredients
    })

  } catch (error) {
    console.error('Error fetching instructions:', error)
    res.status(500).json({ error: 'Something went wrong on the server' })
  }
})


app.listen(port, () => {
    console.log(`server is running on port ${port}`)
})

