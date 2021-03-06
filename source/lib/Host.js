import Promise from 'bluebird'
import axios from 'contentful-sdk-core/vendor-node/axios';
import Contentful from 'contentful/dist/contentful';
import Router from '../lib/Router'
import Renderer from '../lib/Renderer'
import Model from '../lib/Model'

import express from 'express';

const Host = (config) => {
  const contentful = Contentful(axios, {
    space: config.contentful.space,
    accessToken: config.contentful.apiKey,
    host: config.contentful.host || (config.contentful.preview ? 'preview.contentful.com' : 'cdn.contentful.com')
  })

  const model = new Model(config)
  const router = new Router(config, model, contentful)
  const renderer = new Renderer(config, model, router)

  const app = express()

  if (config.staticPath) {
    app.use(express.static(config.staticPath))
  }

  let obj = {}
  for (var k in config.variables) {
    obj[k] = config.variables[k](contentful, model)
  }

  Promise.props(obj).then(variables => {
    app.get('/*', (httpReq, httpRes) => {
      console.log('<', httpReq.url)
      router.getContentByUrl(httpReq.url)
        .then(res => renderer.render(res, variables))
        .then(res => res ? httpRes.send(res) : httpRes.status(404).send('Not found'))
        .catch(err => httpRes.send({ error: err, stack: err.stack }))
    })
  })

  app.listen(6088)
  console.log('listening on port 6088')
}

export default Host
