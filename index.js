require('dotenv').config()
const Telegraf = require('telegraf')
const { Extra } = require('telegraf')
const { Markup } = require('telegraf')
const api = require('./api')

const bot = new Telegraf(process.env.TOKEN_BOT_TELEGRAM)

console.log("init bot")

const listProductDelete = (prod) => {
  const botoes = prod.map(item => {
    return [Markup.callbackButton(`${item.replace(/(^\w{1})|(\s+\w{1})/g, letra => letra.toUpperCase())}`, `+ ${item}`), Markup.callbackButton(`❌`, `delete ${item}`)]
  })
  return Extra.markup(Markup.inlineKeyboard(botoes, { columns: 2 }))
}

const listOptions = () => {
  return Extra.markup(Markup.inlineKeyboard([
    Markup.callbackButton(`Adicionar produtos`, `add`),
    Markup.callbackButton(`Listar produtos`, `list`),
    Markup.callbackButton(`Deletar produtos`, `delete`),
  ], { columns: 2 }))
}

const deleteProduct = async (product, token_bot) => {
  const response = await api.delete(`/product/delete/${token_bot}/${product}`).then((res) => {
    return res.data.data;
  });
  return response
}

const deleteUser = async (product, token_bot) => {
  const response = await api.delete(`/user/delete/${token_bot}/${product}`).then((res) => {
    return res.data.data;
  });
  return response
}

const getProduct = async (token_bot) => {
  const response = await api.get(`/user/find/${token_bot}`).then((res) => {
    return res.data.data.product;
  });
  return response
}

const storeUser = async (ctx, product, token_bot) => {
  await api.post('/user/create', {
    product: product,
    token_bot: token_bot,
  })
    .then(async (response) => {
      await storeProduct(ctx, product, token_bot);
    })
    .catch((error) => {
      console.log(error.message);
      ctx.reply("ERRO: estamos com um problema 😢")
    })
}

const storeProduct = async (ctx, product, token_bot) => {
  await api.post('/product/create', {
    product: product,
    token_bot: token_bot,
  })
    .then(function (response) {
      ctx.telegram.sendMessage(token_bot, `${response.data.data.replace(/(^\w{1})|(\s+\w{1})/g, letra => letra.toUpperCase())} ✅`, listOptions());
    })
    .catch(function (error) {
      console.log(error.message);
      ctx.reply("ERRO: estamos com um problema 😢")
    })
}

const postProduct = async (post) => {
  api.post('/product/post', {
    post: post,
  })
    .catch(function (error) {
      console.log(error.message);
    });
}

const listAPI = async (id) => {
  await api.post('/product/list', {
    token_user: id,
  })
    .catch(function (error) {
      console.log(error.message);
    });
}

bot.action(/delete ([\s\S]+?(?=\b[a-z][)]|$))/, async ctx => {
  const product = ctx.match[1];
  try {
    const del_product = await deleteUser(`${product}`, ctx.update.callback_query.from.id)
    await deleteProduct(`${product}`, ctx.update.callback_query.from.id)
    ctx.reply(`${del_product.replace(/(^\w{1})|(\s+\w{1})/g, letra => letra.toUpperCase())} ✅`, listOptions())
  } catch (error) {
    console.log(error.message)
    ctx.reply("❌ ERRO: estamos com um problema 😢")
  }
})

bot.action("add", async ctx => {
  ctx.reply(`Digite o produto que deseja adicionar`)
  status = true;
})

bot.action("delete", async ctx => {
  const res = await getProduct(ctx.update.callback_query.from.id)
  const new_array = [];
  if (res && res.length > 0) {
    res.map(item => { new_array.push(item.product) })
    await ctx.reply(`Clique no ícone ❌ para deletar o produto da sua lista:`, listProductDelete(new_array))
  } else {
    await ctx.reply(`Não existem produtos cadastrados`, listOptions())
  }
})

bot.action("list", async ctx => {
  const res = await getProduct(ctx.update.callback_query.from.id)
  if (res && res.length > 0) {
    await listAPI(ctx.update.callback_query.from.id)

    await ctx.reply(`Os seguintes produtos acima estão cadastrados na sua lista`, listOptions())
  } else {
    await ctx.reply(`Não existem produtos cadastrados`, listOptions())
  }
})

let status = false;

bot.start(async (ctx) => {
  const name = ctx.update.message.from.first_name;
  await ctx.reply(`
  Bem vindo ${name}, \n\nIrei te notificar quando alguma palavra chave que você adicionou aparecer em uma promoção no canal @xetdaspromocoes 📢\n\nDica: Não use palavras compostas como "Smartphone Samsung" ou "TV LG", utilize palavras simples, uma por vez, com foco no que você quer.
  \nPor exemplo: Smartphone, Notebook, iPhone, etc\n\nEsses são os meus comandos, clique neles para usá-los:`, listOptions());
})

bot.command('produtos', async (ctx) => {
  const res = await getProduct(ctx.message.chat.id)
  const new_array = [];
  if (res && res.length > 0) {
    res.map(item => { new_array.push(item.product) })
    await ctx.reply(`Listando Produtos`, listProduct(new_array))
  } else {
    await ctx.reply(`Você não tem produtos cadastrados`)
    await ctx.reply(`/addproduto - Para adicionar uma palavra chave`)
  }
})

bot.command('addproduto', (ctx) => {
  ctx.reply(`Digite o produto que deseja adicionar`)
  status = true;
})

bot.on('text', async (ctx) => {
  if (status) {
    const product = ctx.message.text.toLowerCase();
    const id_token = ctx.message.chat.id;

    const valid = product.toLowerCase().includes(" ");

    if (valid) {
      ctx.reply(`❌ Erro ao cadastrar produto. Utilize palavras simples, uma por vez, com foco no que você quer.\n\nPor exemplo: Smartphone, Notebook, iPhone, etc`, listOptions())
    } else {
      const res = await getProduct(id_token);
      let getProd = []
      try {
        getProd = await res.filter(item => item.product === product)
        if (getProd[0].product) {
          ctx.reply(`Produto já cadastrado ✅`, listOptions())
        } else {
          await storeUser(ctx, product, id_token);
        }
      } catch (error) {
        await storeUser(ctx, product, id_token);
      }
    }
    /*  Cadastrar multiplos produtos com virgula, Problemas de async await
      const vetor_product = text.split(",");

      vetor_product.map(async prod => {
        await storeProduct(ctx, prod, id_token);
        await storeUser(ctx, prod, id_token);
      })
    */
    status = false;
  }
});

bot.on('photo', async ctx => {
  const oferta = ctx.update.message.caption;
  const res = oferta.toLowerCase().includes("🔗");
  if (res) {
    //    if (myid === 1457269966) {
    await postProduct(oferta);
  }
  //    }
})

bot.startPolling()
