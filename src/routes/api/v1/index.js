const express = require('express')
const router = express.Router()

const Validator = require('validatorjs')
const moment = require('moment')
const crypto = require('crypto')
const sgMail = require('../../../modules/sendgrid')

/**
 * Mongo models
 * 
 */
const Client = require('../../../models/Client')
const Transaction = require('../../../models/Transaction')

router.post('/client', async (req, res) => {
  try {
    const rules = {
      email: 'required|email'
    }
    const validation = new Validator(req.body, rules)
    if (validation.fails()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or missing params.',
        errors: {
          ...validation.errors.errors
        }
      })
    }

    const { email } = req.body
    const account_number = generateSecureRandomAccountNumber()
    const client = new Client({
      account_number,
      email
    })
    await client.save()
    const transactions = await createTransactionsForNewClient()
    
    const updatedClient = await Client.findOneAndUpdate({
      '_id': client._id
    },
    {
      '$push': {
        transactions: transactions.map(t => t._id)
      }
    },
    {
      new: true
    })

    /**
     * Send welcome email to user
     * 
     */
    try {
      const msg = {
        to: email,
        from: 'no-reply@destradigital.com',
        template_id: 'd-7d00e1a7b3ff4edea93cf8d5d4f647e3',
        dynamic_template_data: {
          user: email.split('@')[0],
          account_number
        }
      }

      await sgMail.send(msg)
    } catch (e) {
      console.error(e)
    }

    return res.json({
      success: true,
      resource: updatedClient
    })
  } catch (e) {
    console.log(e);
    if (e.message && e.message.includes('duplicate key error collection')) {
      return res.status(400).json({
        success: false,
        error: 'Account with email already exist.'
      })
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid or missing params.'
      })
    }
  }
})

router.get('/client/:account_number', async (req, res) => {
  try {
    const { account_number } = req.params
    const client = await Client.findOne({
      'account_number': account_number
    })
    .populate({
      path: 'transactions',
      options: {
        sort: {
          'date': -1
        }
      }
    })

    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Not found with provided id.'
      })
    }

    return res.json({
      success: true,
      resource: client
    })
  } catch (e) {
    console.log(e.message)
    if (e.message.includes('Cast to ObjectId failed for value')) {
      return res.status(404).json({
        success: false,
        error: 'Not found with provided id.'
      })
    } else {
      return res.status(500).json({
        success: false,
        error: 'Something broke. Try again.'
      })
    }
  }
})

router.post('/client/:account_number/create-transaction', async (req, res) => {
  try {
    const rules = {
      type: 'required|in:debit,credit',
      amount: 'required|numeric',
      date: 'required|date'
    }
    const validation = new Validator(req.body, rules)
    if (validation.fails()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or missing params.',
        errors: {
          ...validation.errors.errors
        }
      })
    }

    const { account_number } = req.params
    const { type, amount, date } = req.body

    const client = await Client.findOne({
      'account_number': account_number
    })

    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Not found with provided id.'
      })
    }

    const transaction = new Transaction({
      type,
      amount, 
      date
    })

    await transaction.save()

    await client.updateOne({
      '$push': {
        transactions: transaction._id
      }
    })
    
    return res.json({
      success: true,
      resource: transaction
    })
  } catch (e) {
    console.log(e);
    return res.status(400).json({
      success: false,
      error: 'Invalid or missing params.'
    })
  }
})

router.get('/client/:account_number/request-summary', async (req, res) => {
  try {
    const { account_number } = req.params
    const client = await Client.findOne({
      'account_number': account_number
    })
    .populate({
      path: 'transactions',
      options: {
        sort: {
          'date': 1
        }
      }
    })

    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Not found with provided id.'
      })
    }

    const transactions = client.transactions
    const data = {
      total_balance: 0,
      avg_debit: 0,
      avg_credit: 0,
      account_number,
      months: []
    }

    for (let transaction of transactions) {
      if (transaction.type == 'credit') {
        data.total_balance += transaction.amount
      } else {
        data.total_balance -= transaction.amount
      }

      let date = moment(transaction.date)
      let month = date.format('MMMM')
      let foundMonth = data.months.find(m => m.name == month)
      if (foundMonth) {
        foundMonth.value ++
      } else {
        data.months.push({
          name: month,
          value: 1
        })
      }
    }
    data.total_balance = formatMoney(data.total_balance)
    data.avg_debit = formatMoney( transactions.filter(t => t.type == 'debit').map(t => t.amount).reduce((t, n) => t - n, 0))
    data.avg_credit = formatMoney( transactions.filter(t => t.type == 'credit').map(t => t.amount).reduce((t, n) => t + n, 0))

    try {
      const msg = {
        to: client.email,
        from: 'no-reply@destradigital.com',
        template_id: 'd-1bf9089a74c94073a80ddb16be8bf3e9',
        dynamic_template_data: {
          ...data
        }
      }

      await sgMail.send(msg)
    } catch (e) {
      console.error(e)
    }

    return res.json({
      success: true,
      resource: data
    })
  } catch (e) {
    console.log(e.message)
    if (e.message.includes('Cast to ObjectId failed for value')) {
      return res.status(404).json({
        success: false,
        error: 'Not found with provided id.'
      })
    } else {
      return res.status(500).json({
        success: false,
        error: 'Something broke. Try again.'
      })
    }
  }
})

const createTransactionsForNewClient = () => {
  return new Promise(async (resolve, reject) => {
    try {
      const types = ['debit', 'credit']
      const transactions = []
      for (let i = 0; i < 10; i++) {
        let type = types[Math.trunc(Math.random() * 2)]
        let amount = parseFloat((Math.random() * 1000).toFixed(2))
        let date = moment().day((Math.random() * 29).toFixed(0)).month((Math.random() * 11).toFixed(0)).toISOString()
        transactions.push({
          type,
          amount,
          date
        })
      }
  
      const savedTransactions = await Transaction.insertMany(transactions)
      resolve(savedTransactions)
    } catch (e) {
      console.error(e)
      reject(e)
    }
  })
}

const generateSecureRandomAccountNumber = () => {
  const buf = crypto.randomBytes(3)
  return parseInt(buf.toString('hex'), 16)
}

const formatMoney = (amount, decimalCount = 2, decimal = '.', thousands = ',') => {
  try {
    decimalCount = Math.abs(decimalCount)
    decimalCount = isNaN(decimalCount) ? 2 : decimalCount

    const negativeSign = amount < 0 ? '-' : ''

    const i = parseInt(amount = Math.abs(Number(amount) || 0).toFixed(decimalCount)).toString()
    const j = (i.length > 3) ? i.length % 3 : 0

    return (negativeSign +
      (j ? i.substr(0, j) + thousands : '') +
      i.substr(j).replace(/(\d{3})(?=\d)/g, '$1' + thousands) +
      (decimalCount ? decimal + Math.abs(amount - i).toFixed(decimalCount).slice(2) : '')).replace(/((\.00)|(\.[1-9]0)|(\.[1-9]{1,})|(\.0*[1-9]*))0*$/, '$1')
  } catch (e) {
    console.log(e)
  }
}

module.exports = router