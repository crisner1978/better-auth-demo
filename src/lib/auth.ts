import { stripe } from '@better-auth/stripe'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { nextCookies } from 'better-auth/next-js'
import {
  admin,
  bearer,
  customSession,
  multiSession,
  oAuthProxy,
  oidcProvider,
  oneTap,
  openAPI,
  organization,
  twoFactor,
} from 'better-auth/plugins'
import { passkey } from 'better-auth/plugins/passkey'
import { Stripe } from 'stripe'
import { reactInvitationEmail } from './email/invitation'
import { resend } from './email/resend'
import { reactResetPasswordEmail } from './email/reset-password'
import { ObjectId } from 'mongodb'

// Import from our prisma.ts file instead of creating a new instance
import { db as prisma } from './prisma'

const from = process.env.BETTER_AUTH_EMAIL || 'delivered@resend.dev'
const to = process.env.TEST_EMAIL || ''

const PROFESSION_PRICE_ID = {
  default: 'price_1QxWZ5LUjnrYIrml5Dnwnl0X',
  annual: 'price_1QxWZTLUjnrYIrmlyJYpwyhz',
}
const STARTER_PRICE_ID = {
  default: 'price_1QxWWtLUjnrYIrmleljPKszG',
  annual: 'price_1QxWYqLUjnrYIrmlonqPThVF',
}

export const auth = betterAuth({
  appName: 'Better Auth Demo',
  database: prismaAdapter(prisma, {
    provider: 'mongodb',
  }),
  advanced: {
    database: {
      generateId: () => new ObjectId().toString(),
    },
  },

  emailVerification: {
    async sendVerificationEmail({ user, url }) {
      const res = await resend.emails.send({
        from,
        to: to || user.email,
        subject: 'Verify your email address',
        html: `<a href="${url}">Verify your email address</a>`,
      })
      console.log(res, user.email)
    },
  },
  account: {
    accountLinking: {
      trustedProviders: ['google', 'github', 'demo-app'],
    },
  },
  emailAndPassword: {
    enabled: true,
    async sendResetPassword({ user, url }) {
      await resend.emails.send({
        from,
        to: user.email,
        subject: 'Reset your password',
        react: reactResetPasswordEmail({
          username: user.email,
          resetLink: url,
        }),
      })
    },
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    },
    google: {
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    },
  },
  plugins: [
    organization({
      async sendInvitationEmail(data) {
        await resend.emails.send({
          from,
          to: data.email,
          subject: "You've been invited to join an organization",
          react: reactInvitationEmail({
            username: data.email,
            invitedByUsername: data.inviter.user.name,
            invitedByEmail: data.inviter.user.email,
            teamName: data.organization.name,
            inviteLink:
              process.env.NODE_ENV === 'development'
                ? `http://localhost:3000/accept-invitation/${data.id}`
                : `${process.env.BETTER_AUTH_URL || ''}/accept-invitation/${data.id}`,
          }),
        })
      },
    }),
    twoFactor({
      otpOptions: {
        async sendOTP({ user, otp }) {
          await resend.emails.send({
            from,
            to: user.email,
            subject: 'Your OTP',
            html: `Your OTP is ${otp}`,
          })
        },
      },
    }),
    passkey(),
    openAPI(),
    bearer(),
    admin({
      adminUserIds: [''],
    }),
    multiSession(),
    oAuthProxy(),
    nextCookies(),
    oidcProvider({
      loginPage: '/sign-in',
    }),
    oneTap(),
    customSession(async (session) => {
      return {
        ...session,
        user: {
          ...session.user,
          dd: 'test',
        },
      }
    }),
    stripe({
      stripeClient: new Stripe(process.env.STRIPE_KEY || 'sk_test_'),
      stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
      subscription: {
        enabled: true,
        plans: [
          {
            name: 'Starter',
            priceId: STARTER_PRICE_ID.default,
            annualDiscountPriceId: STARTER_PRICE_ID.annual,
            freeTrial: {
              days: 7,
            },
          },
          {
            name: 'Professional',
            priceId: PROFESSION_PRICE_ID.default,
            annualDiscountPriceId: PROFESSION_PRICE_ID.annual,
          },
          {
            name: 'Enterprise',
          },
        ],
      },
    }),
  ],
  trustedOrigins: [
    'https://better-auth-demo-git-main-chrisdrivlys-projects.vercel.app/',
    'https://better-auth-demo-968d85zw2-chrisdrivlys-projects.vercel.app/',
  ],
})
