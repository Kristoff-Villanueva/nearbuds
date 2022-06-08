import {
  API_KEY,
  SECRET_KEY,
  ADMIN_API_KEY,
  ADMIN_SECRET_KEY,
  WALLETS_SERVICE_URL,
  USERS_SERVICE_URL,
  ADDRESS_SERVICE_URL,
  MAPS_API_KEY,
} from './config.js'

const middleware = () => {
  if (localStorage.getItem('token') === null) {
    window.location.href = 'auth.html'
  }
}

Path.map('#/')
  .enter(middleware)
  .to(async () => {
    const user = JSON.parse(localStorage.getItem('user_profile'))

    // Get registered users
    let authorizationToken = await generateAdminAuthorizationToken()
    const { data: users } = await axios.get(`${USERS_SERVICE_URL}/accounts/`, {
      headers: {
        Authorization: `Bearer ${authorizationToken}`,
      },
    })

    const path = 'templates/home.mustache'
    await renderTemplate(path, { users })

    // Add map marker for own location
    let map = L.map('map').setView(user.meta.coordinates.split(','), 15)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    })
      .addTo(map)
      .bindPopup(`<strong>You</strong> <br/> ${user.meta.location} <br/>`, {
        closeButton: false,
      })

    // Define icons
    const selfIcon = L.icon({
      iconUrl: '/images/icons/self.png',
      iconSize: [48, 48],
    })

    const strangerIcon = L.icon({
      iconUrl: '/images/icons/stranger.png',
      iconSize: [48, 48],
    })

    const friendIcon = L.icon({
      iconUrl: '/images/icons/friend.png',
      iconSize: [48, 48],
    })

    L.marker(user.meta.coordinates.split(','), { icon: selfIcon }).addTo(map)

    // Add or remove friend function
    window.process = async (email, friend) => {
      let accessToken = await generateAuthorizationToken()
      let authorizationToken = localStorage.getItem('token')
      const user = JSON.parse(localStorage.getItem('user_profile'))
      let friends = user.meta.friends

      if (friend) {
        friends = friends.filter((item) => item !== email)
      } else {
        friends.push(email)
      }

      // Update friends list of logged in user
      await axios.put(
        `${USERS_SERVICE_URL}/profile`,
        {
          meta: {
            ...user.meta,
            friends,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${authorizationToken}`,
            'Access-Token': accessToken,
          },
        }
      )

      // Get updated profile, update localStorage copy
      const { data: profile } = await axios.get(
        `${USERS_SERVICE_URL}/profile`,
        {
          headers: {
            Authorization: `Bearer ${authorizationToken}`,
            'Access-Token': accessToken,
          },
        }
      )

      await localStorage.setItem('user_profile', JSON.stringify(profile.data))
      await window.location.reload()
    }

    // Place markers for each registered user, differentiated if friend or stranger
    users.data.forEach((item) => {
      if (item.email !== user.email) {
        const friend = user.meta.friends.includes(item.email)
        L.marker(item.meta.coordinates.split(','), {
          icon: friend ? friendIcon : strangerIcon,
        })
          .addTo(map)
          .bindPopup(
            `<strong>${item.first_name} ${item.last_name}</strong> <br/> ${
              item.meta.location
            } <br/> <button type="button" class="btn ${
              friend ? 'btn-outline-danger' : 'btn-outline-primary'
            } btn-sm mt-2" onclick='process("${item.email}", ${friend})'>${
              friend ? 'Unfriend' : 'Add Friend'
            }</button>`,
            {
              closeButton: false,
            }
          )
      }
    })
  })

Path.map('#/profile').to(async () => {
  const path = 'templates/profile.mustache'

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

  const user = JSON.parse(localStorage.getItem('user_profile'))

  const data = {
    firstname: user.first_name,
    lastname: user.last_name,
    regions: regionsList,
    address: user.address,
    error: false,
    message: '',
  }

  await renderTemplate(path, data)

  const regionsDropdown = document.getElementById('profile-regions-dropdown')
  const provincesDropdown = document.getElementById(
    'profile-provinces-dropdown'
  )
  const municipalitiesDropdown = document.getElementById(
    'profile-municipalities-dropdown'
  )
  const barangaysDropdown = document.getElementById(
    'profile-barangays-dropdown'
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

  document.getElementById('profile-form').onsubmit = async (e) => {
    e.preventDefault()
    const firstname = document.getElementById('profile-firstname').value
    const lastname = document.getElementById('profile-lastname').value
    const region = regionsDropdown.options[regionsDropdown.selectedIndex].text
    const province =
      provincesDropdown.options[provincesDropdown.selectedIndex].text
    const municipality =
      municipalitiesDropdown.options[municipalitiesDropdown.selectedIndex].text
    const barangay =
      barangaysDropdown.options[barangaysDropdown.selectedIndex].text

    const streetAddress = document.getElementById(
      'profile-street-address'
    ).value

    try {
      const { data: geocode } = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${streetAddress}+${barangay}+${municipality}+${province}+${region}+Philippines&key=${MAPS_API_KEY}`
      )

      try {
        let accessToken = await generateAuthorizationToken()
        let authorizationToken = localStorage.getItem('token')
        await axios.put(
          `${USERS_SERVICE_URL}/profile`,
          {
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
              friends: [...user.meta.friends],
            },
          },
          {
            headers: {
              Authorization: `Bearer ${authorizationToken}`,
              'Access-Token': accessToken,
            },
          }
        )

        try {
        } catch (error) {
          console.log(error)
        }

        // Get updated profile, update localStorage copy
        const { data: profile } = await axios.get(
          `${USERS_SERVICE_URL}/profile`,
          {
            headers: {
              Authorization: `Bearer ${authorizationToken}`,
              'Access-Token': accessToken,
            },
          }
        )

        await localStorage.setItem('user_profile', JSON.stringify(profile.data))
        await window.location.reload()
      } catch (error) {
        console.log(error)
      }
    } catch (error) {
      console.log(error)
    }
  }
})

Path.map('#/logout').to(async () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user_profile')
  window.location.href = 'auth.html'
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

const generateAdminAuthorizationToken = async () => {
  try {
    const { data } = await axios.post(`${WALLETS_SERVICE_URL}/auth`, {
      key: ADMIN_API_KEY,
      secret: ADMIN_SECRET_KEY,
    })

    return data.access_token
  } catch (error) {
    console.log(error)
  }
}

Path.root('#/')
Path.listen()
