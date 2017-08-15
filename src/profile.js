const tv4 = require('tv4')
const lodash = require('lodash')


// Module API

class Profile {

  // Public

  static async load(profile) {
    return new Profile(profile)
  }

  get name() {
    if (!this._jsonschema.title) return null
    return this._jsonschema.title.replace(' ', '-').toLowerCase()
  }

  get jsonschema() {
    return this._jsonschema
  }

  validate(descriptor) {
    const errors = []

    // Basic validation
    const validation = tv4.validateMultiple(descriptor, this._jsonschema)
    for (const validationError of validation.errors) {
      errors.push(new Error(
        `Descriptor validation error:
        ${validationError.message}
        at "${validationError.dataPath}" in descriptor and
        at "${validationError.schemaPath}" in profile`))
    }

    // Extra validation
    if (!errors.length) {

      // PrimaryKey validation
      for (const message of validatePrimaryKey(descriptor)) {
        errors.push(new Error(message))
      }

      // ForeignKeys validation
      for (const message of validateForeignKeys(descriptor)) {
        errors.push(new Error(message))
      }

    }

    // Throw errors
    if (errors.length) {
      throw errors
    }

    return true
  }

  // Private

  constructor(profile) {
    this._profile = profile
    try {
      this._jsonschema = require(`./profiles/${profile}.json`) // eslint-disable-line
    } catch (error) {
      throw new Error(`Can't load profile "${profile}"`)
    }
  }

}


// Internal


function validatePrimaryKey(descriptor) {
  const messages = []
  const fieldNames = (descriptor.fields || []).map(field => field.name)
  if (descriptor.primaryKey) {
    const primaryKey = descriptor.primaryKey
    if (lodash.isString(primaryKey)) {
      if (!lodash.includes(fieldNames, primaryKey)) {
        messages.push(`primary key ${primaryKey} must match schema field names`)
      }
    } else if (lodash.isArray(primaryKey)) {
      lodash.each(primaryKey, pk => {
        if (!lodash.includes(fieldNames, pk)) {
          messages.push(`primary key ${pk} must match schema field names`)
        }
      })
    }
  }
  return messages
}


function validateForeignKeys(descriptor) {
  const messages = []
  const fieldNames = (descriptor.fields || []).map(field => field.name)
  if (descriptor.foreignKeys) {
    const foreignKeys = descriptor.foreignKeys
    lodash.each(foreignKeys, fk => {
      if (lodash.isString(fk.fields)) {
        if (!lodash.includes(fieldNames, fk.fields)) {
          messages.push(`foreign key ${fk.fields} must match schema field names`)
        }
        if (!lodash.isString(fk.reference.fields)) {
          messages.push(`foreign key ${fk.reference.fields} must be same type as ${fk.fields}`)
        }
      } else if (lodash.isArray(fk.fields)) {
        lodash.each(fk.fields, field => {
          if (!lodash.includes(fieldNames, field)) {
            messages.push(`foreign key ${field} must match schema field names`)
          }
        })
        if (!lodash.isArray(fk.reference.fields)) {
          messages.push(`foreign key ${fk.reference.fields} must be same type as ${fk.fields}`)
        } else if (fk.reference.fields.length !== fk.fields.length) {
          messages.push('foreign key fields must have the same length as reference.fields')
        }
      }
      if (fk.reference.resource === '') {
        if (lodash.isString(fk.reference.fields)) {
          if (!lodash.includes(fieldNames, fk.reference.fields)) {
            messages.push(`foreign key ${fk.fields} must be found in the schema field names`)
          }
        } else if (lodash.isArray(fk.reference.fields)) {
          lodash.each(fk.reference.fields, field => {
            if (!lodash.includes(fieldNames, field)) {
              messages.push(`foreign key ${field} must be found in the schema field names`)
            }
          })
        }
      }
    })
  }
  return messages
}


// System

module.exports = {
  Profile,
}