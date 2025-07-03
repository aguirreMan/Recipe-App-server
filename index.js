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

  if(!id){
    return res.status(400).json({error: 'Missing recipe id'})
  }

  try {
    const instructionsEndPoint = `https://api.spoonacular.com/recipes/${id}/analyzedInstructions?apiKey=${apiKey}`
    const ingredientsEndPoint = `https://api.spoonacular.com/recipes/${id}/information?apiKey=${apiKey}`

    const [instructionData, ingredientData] = await Promise.all([
      fetch(instructionsEndPoint),
      fetch(ingredientsEndPoint)
    ])

    if(!instructionData.ok || !ingredientData.ok) {
      return res.status(502).json({ error: 'Failed to fetch recipe data' });
    }

    const instructionInfo = await instructionData.json()
    const ingredientsInfo = await ingredientData.json()

    if(!instructionInfo || instructionInfo.length === 0 || !instructionInfo[0].steps){
      return res.status(404).json({error: 'No instructions for this recipe'})
    }

    const steps = instructionInfo[0].steps.map(step => ({
      number: step.number,
      step: step.step
    }))

    if(!ingredientsInfo || !ingredientsInfo.extendedIngredients || ingredientsInfo.extendedIngredients.length === 0){
      return res.status(404).json({error: 'No ingredients for this recipe'})
    }

    const recipeId = ingredientsInfo.id
    const servings = ingredientsInfo.servings
    const readyInMinutes = ingredientsInfo.readyInMinutes
    
    function formatIngredients(extendedIngredients){
      return extendedIngredients.map(ingredient => {
        const measures = formatMeasurementSystem(ingredient)
        return {
          name: ingredient.name,
          original: ingredient.original,
          unit: ingredient.unit || '',
          measures
        }
      })
    }

    function formatMeasurementSystem(ingredient){
      const us = ingredient.measures?.us
      const metric = ingredient.measures?.metric
      return {
        us: us ? `${us.amount} ${us.unitShort}` : '',
        metric: metric ? `${metric.amount} ${metric.unitShort}` : ''
      }
    }

    const ingredientsArray = formatIngredients(ingredientsInfo.extendedIngredients)

    res.json({
    recipeId,
    servings,
    readyInMinutes,
    instructions: steps,
    ingredients: ingredientsArray,
  })

  } catch (error){
    console.error('Error fetching recipe data', error)
    res.status(500).json({error: 'failed request'})
  }
})

app.listen(port, () => {
    console.log(`server is running on port ${port}`)
})
