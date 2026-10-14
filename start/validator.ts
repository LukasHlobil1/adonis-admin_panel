/*
|--------------------------------------------------------------------------
| Validator file
|--------------------------------------------------------------------------
|
| The validator file is used for configuring global transforms for VineJS.
| The transform below converts all VineJS date outputs from JavaScript
| Date objects to Luxon DateTime instances, so that validated dates are
| ready to use with Lucid models and other parts of the app that expect
| Luxon DateTime.
|
*/

import { DateTime } from 'luxon'
import vine, { SimpleMessagesProvider, VineDate } from '@vinejs/vine'

declare module '@vinejs/vine/types' {
  interface VineGlobalTransforms {
    date: DateTime
  }
}

VineDate.transform((value) => DateTime.fromJSDate(value))

/**
 * České chybové hlášky validace a názvy polí, které se do nich dosazují.
 */
vine.messagesProvider = new SimpleMessagesProvider(
  {
    'required': 'Pole {{ field }} je povinné.',
    'string': 'Pole {{ field }} musí být text.',
    'email': 'Zadejte platnou e-mailovou adresu.',
    'minLength': 'Pole {{ field }} musí mít alespoň {{ min }} znaků.',
    'maxLength': 'Pole {{ field }} může mít nejvýše {{ max }} znaků.',
    'sameAs': 'Hesla se neshodují.',
    'boolean': 'Neplatná hodnota pole {{ field }}.',
    'enum': 'Zvolená hodnota pole {{ field }} není platná.',
    'database.unique': 'Tento e-mail už používá jiný uživatel.',
  },
  {
    fullName: 'Celé jméno',
    email: 'E-mail',
    password: 'Heslo',
    passwordConfirmation: 'Potvrzení hesla',
    currentPassword: 'Stávající heslo',
    role: 'Role',
    isActive: 'Aktivní',
  }
)
