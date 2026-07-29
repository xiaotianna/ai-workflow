export interface LoginVo {
  id: string
  phone: string
  username: string
  createdAt: Date
  updatedAt: Date
  token: string
}

export interface CurrentUserVo {
  phone: string
  username: string
}
