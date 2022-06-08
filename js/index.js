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
