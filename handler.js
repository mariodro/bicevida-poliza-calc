'use strict'
const _ = require('lodash')
const axios = require('axios').default

/**
 * Calculo de Poliza para cada trabajador
 * 
 * a. Costo por empleado por cobertura de salud/vida:
 *    i. Un empleado sin hijo/as tiene un costo de 0,279 UF.
 *    ii. Un empleado con 1 hijo/a tiene un costo de 0,4396 UF.
 *    iii. Un empleado con 2 o hijo/as tiene un costo de 0,5599 UF.
 *
 * b. Costo por empleado por cobertura dental:
 *    i. Un empleado sin hijo/as tiene un costo de 0,12 UF.
 *    ii. Un empleado con 1 hijo/as tiene un costo de 0,1950 UF.
 *    iii. Un empleado con 2 o más hijo/as tiene un costo de 0,2480 UF.
 * c. Empleados mayores a 65 años no tienen cobertura y por ende no tienen costo para la empresa.
 * d. El % de la empresa es el costo que asumirá la empresa del costo total de la póliza, el resto es cubierto por cada empleado.
 * 
 * @param {integer} age Edad del trabajador
 * @param {integer} childs Hijos del trabajador
 * @param {boolean} has_dental_care Tiene cobertura dental
 * @param {float} company_percentage Porcentaje pagado por la empresa
 * @return {{company: float, worker: float}} Valor a pagar por la empresa y el empleado.
**/
function calcPolicy (age, childs, has_dental_care, company_percentage)
{
  let cost = 0
  if (age <= 65)
  {
    switch(childs) {
      case 0:
        cost += 0.279
        cost += has_dental_care ? 0.12 : 0
        break
      case 1:
        cost += 0.4396
        cost += has_dental_care ? 0.1950 : 0
        break
      // dos o mas hijos
      default:
        cost += 0.5599
        cost += has_dental_care ? 0.2480 : 0
        break
    }
  }
  
  return {
    company: cost * company_percentage / 100,
    worker: cost * (100 - company_percentage) / 100
  }
}


module.exports.policy = async event => {
  
  const url = 'https://dn8mlk7hdujby.cloudfront.net/interview/insurance/policy'

  const { data } = await axios.get(url)
  
  if (typeof(data) == 'undefined')
  {
    return {
      statusCode: 503,
      body: JSON.stringify(
        {
          message: 'Service Unavailable: Error al cargar los datos',
        },
        null,
        2
      )
    }
  }

  const policy = data.policy
  
  const { workers, has_dental_care, company_percentage } = policy

  const policyCost = _.map(workers, (worker) => {
    return {
      ...worker,
      cost: calcPolicy(worker.age, worker.childs, has_dental_care, company_percentage)
    }
  })
  
  const policyTotal = {
    company: _.sumBy(policyCost, 'cost.company'),
    workers: _.sumBy(policyCost, 'cost.worker')
  }
  
  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        message: 'Go Serverless v1.0! Your function executed successfully!',
        input: policy,
        data: {
          policy: {
            workers: policyCost,
            total: policyTotal
          }
        }
      },
      null,
      2
    ),
  }
}
