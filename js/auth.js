import {
  API_KEY,
  SECRET_KEY,
  WALLETS_SERVICE_URL,
  USERS_SERVICE_URL,
  ADDRESS_SERVICE_URL,
  MAPS_API_KEY,
} from './config.js'

Path.map('#/').to(() => {
  window.location.hash = '#/login'
})

Path.map('#/login').to(async () => {
  const path = 'templates/login.mustache'
  const data = {
    username: '',
    password: '',
    error: false,
    message: '',
  }
  await renderTemplate(path, data)

  document.getElementById('login-form').onsubmit = async (e) => {
    e.preventDefault()
    const username = document.getElementById('login-username').value
    const password = document.getElementById('login-password').value

    const authorizationToken = await generateAuthorizationToken()

    try {
      const { data } = await axios.post(
        `${USERS_SERVICE_URL}/login`,
        {
          username,
          password,
        },
        {
          headers: {
            Authorization: `Bearer ${authorizationToken}`,
          },
        }
      )

      localStorage.setItem('token', data.access_token)
      localStorage.setItem('user_profile', JSON.stringify(data.user_profile))

      window.location.href = '/'
    } catch (error) {
      console.log(error)

      await renderTemplate(path, {
        username,
        password,
        error: true,
        message: 'Invalid username/password',
      })
    }
  }
})

Path.map('#/register').to(async () => {
  const path = 'templates/register.mustache'

  // Get list of Regions
  let regionsList = []
  if (localStorage.getItem('regions') === null) {
    let authorizationToken = await generateAuthorizationToken()
    const { data: regions } = await axios.post(
      `${ADDRESS_SERVICE_URL}/regions`,
      {},
      {
        headers: {
          Authorization: `Bearer ${authorizationToken}`,
        },
      }
    )
    regionsList = regions.data
    localStorage.setItem('regions', JSON.stringify(regions.data))
  } else {
    regionsList = JSON.parse(localStorage.getItem('regions'))
  }

  const data = {
    email: '',
    password: '',
    firstname: '',
    lastname: '',
    regions: regionsList,
    error: false,
    message: '',
  }

  await renderTemplate(path, data)

  const regionsDropdown = document.getElementById('register-regions-dropdown')
  const provincesDropdown = document.getElementById(
    'register-provinces-dropdown'
  )
  const municipalitiesDropdown = document.getElementById(
    'register-municipalities-dropdown'
  )
  const barangaysDropdown = document.getElementById(
    'register-barangays-dropdown'
  )

  // If region was selected, get provinces
  regionsDropdown.onchange = async () => {
    //Reset dropdown options
    provincesDropdown.options.length = 0
    municipalitiesDropdown.options.length = 0
    barangaysDropdown.options.length = 0

    //Get provinces of selected region
    let authorizationToken = await generateAuthorizationToken()
    const { data: provinces } = await axios.post(
      `${ADDRESS_SERVICE_URL}/provinces/`,
      {
        region_id: [regionsDropdown.value],
      },
      {
        headers: {
          Authorization: `Bearer ${authorizationToken}`,
        },
      }
    )

    //Dynamically add options for province dropdown
    provinces.data.forEach((item) => {
      provincesDropdown.options[provincesDropdown.options.length] = new Option(
        item.province_name,
        item.province_id
      )
    })
  }

  // If province was selected, get municipalities
  provincesDropdown.onchange = async () => {
    //Reset dropdown option
    municipalitiesDropdown.options.length = 0
    barangaysDropdown.options.length = 0

    //Get municipalities of selected province
    let authorizationToken = await generateAuthorizationToken()
    const { data: municipalities } = await axios.post(
      `${ADDRESS_SERVICE_URL}/municipalities/`,
      {
        region_id: [regionsDropdown.value],
        province_id: [provincesDropdown.value],
      },
      {
        headers: {
          Authorization: `Bearer ${authorizationToken}`,
        },
      }
    )

    //Dynamically add options for municipalities dropdown
    municipalities.data.forEach((item) => {
      municipalitiesDropdown.options[municipalitiesDropdown.options.length] =
        new Option(item.municipality_name, item.municipality_id)
    })
  }

  // If municipality was selected, get barangays
  municipalitiesDropdown.onchange = async () => {
    //Reset dropdown option
    barangaysDropdown.options.length = 0

    //Get barangays of selected municipality
    let authorizationToken = await generateAuthorizationToken()
    const { data: barangays } = await axios.post(
      `${ADDRESS_SERVICE_URL}/barangays/`,
      {
        region_id: [regionsDropdown.value],
        province_id: [provincesDropdown.value],
        municipality_id: [municipalitiesDropdown.value],
      },
      {
        headers: {
          Authorization: `Bearer ${authorizationToken}`,
        },
      }
    )

    //Dynamically add options for municipalities dropdown
    barangays.data.forEach((item) => {
      barangaysDropdown.options[barangaysDropdown.options.length] = new Option(
        item.barangay_name,
        item.barangay_id
      )
    })
  }

  document.getElementById('register-form').onsubmit = async (e) => {
    e.preventDefault()
    const email = document.getElementById('register-email').value
    const password = document.getElementById('register-password').value
    const firstname = document.getElementById('register-firstname').value
    const lastname = document.getElementById('register-lastname').value
    const region = regionsDropdown.options[regionsDropdown.selectedIndex].text
    const province =
      provincesDropdown.options[provincesDropdown.selectedIndex].text
    const municipality =
      municipalitiesDropdown.options[municipalitiesDropdown.selectedIndex].text
    const barangay =
      barangaysDropdown.options[barangaysDropdown.selectedIndex].text

    const streetAddress = document.getElementById(
      'register-street-address'
    ).value

    try {
      const { data: geocode } = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${streetAddress}+${barangay}+${municipality}+${province}+${region}+Philippines&key=${MAPS_API_KEY}`
      )
      await console.log(geocode)

      try {
        let authorizationToken = await generateAuthorizationToken()
        await axios.post(
          `${USERS_SERVICE_URL}/register`,
          {
            email,
            password,
            first_name: firstname,
            last_name: lastname,
            region,
            province,
            city_municipality: municipality,
            barangay,
            address: streetAddress,
            meta: {
              location: geocode.results[0].formatted_address,
              coordinates: `${geocode.results[0].geometry.location.lat},${geocode.results[0].geometry.location.lng}`,
              friends: [],
            },
          },
          {
            headers: {
              Authorization: `Bearer ${authorizationToken}`,
            },
          }
        )

        try {
        } catch (error) {
          console.log(error)
        }

        window.location.hash = `#/login`
      } catch (error) {
        console.log(error)

        await renderTemplate(path, {
          email,
          password,
          firstname,
          lastname,
          error: true,
          message: 'Error ocurred',
        })
      }
    } catch (error) {
      console.log(error)
    }
  }
})

const generateAuthorizationToken = async () => {
  try {
    const { data } = await axios.post(`${WALLETS_SERVICE_URL}/auth`, {
      key: API_KEY,
      secret: SECRET_KEY,
    })

    return data.access_token
  } catch (error) {
    console.log(error)
  }
}

Path.root('#/')
Path.listen()
