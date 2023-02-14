<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />

        <q-toolbar-title>
          Kataster jam
        </q-toolbar-title>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" show-if-above bordered>
      <q-list>
        <q-item-label header>
          Navigation
        </q-item-label>

        <q-item clickable :to="{ name: 'home' }" exact>
          <q-item-section avatar>
            <q-icon name="home" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Home</q-item-label>
          </q-item-section>
        </q-item>

        <q-item clickable :to="{ name: 'caves' }">
          <q-item-section avatar>
            <q-icon name="egg_alt" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Caves</q-item-label>
          </q-item-section>
        </q-item>
        <q-item clickable v-ripple @click.once="logOutButton">
          <q-item-section avatar>
            <q-icon name="logout" />
          </q-item-section>
          <q-item-section>Log out</q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script>
import { defineComponent, ref } from 'vue'
import { useAuthStore } from 'stores/auth-store'

export default defineComponent({
  name: 'MainLayout',

  components: {},

  setup () {
    const store = useAuthStore()
    const leftDrawerOpen = ref(false)

    return {
      store,
      leftDrawerOpen,
      toggleLeftDrawer () {
        leftDrawerOpen.value = !leftDrawerOpen.value
      }
    }
  },
  methods: {
    async logOutButton () {
      try {
        await this.store.logOut()
      } finally {
        this.$router.replace('/login')
      }
    }
  }
})
</script>
